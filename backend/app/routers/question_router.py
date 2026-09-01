"""
Question Router — endpoint de geração de perguntas via Gemini.
"""

import json
import random

from fastapi import APIRouter, HTTPException, status

from app.localization import api_message
from app.schemas.question import GenerateQuestionRequest, GenerateQuestionResponse
from app.services.gemini_service import generate_question
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.post(
    "/generate-question",
    response_model=GenerateQuestionResponse,
    summary="Gera uma pergunta baseada no PDF",
    description="Seleciona um chunk do documento e usa o Gemini para gerar uma pergunta técnica.",
)
async def generate_question_endpoint(request: GenerateQuestionRequest):
    """
    Pipeline de geração:
    1. Busca o documento no Supabase pelo ID.
    2. Seleciona um chunk (específico ou aleatório).
    3. Envia ao Gemini para geração de pergunta.
    4. Retorna pergunta + resposta de referência + chunk usado.
    """

    # --- BUSCA DOCUMENTO ---
    supabase = get_supabase_client()

    result = (
        supabase.table("documents")
        .select("id, chunks")
        .eq("id", request.document_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=api_message(
                request.language,
                'document_not_found',
                document_id=request.document_id,
            ),
        )

    document = result.data[0]
    chunks = json.loads(document["chunks"]) if isinstance(document["chunks"], str) else document["chunks"]

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(request.language, 'document_no_chunks'),
        )

    # --- SELECIONA CHUNK ---
    eligible_indices = list(range(len(chunks)))
    if request.chunk_indices is not None:
        eligible_indices = sorted({
            index
            for index in request.chunk_indices
            if 0 <= index < len(chunks)
        })
        if not eligible_indices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=api_message(request.language, 'no_eligible_chunks'),
            )

    if request.chunk_index is not None:
        if request.chunk_index < 0 or request.chunk_index >= len(chunks):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=api_message(
                    request.language,
                    'chunk_out_of_range',
                    index=request.chunk_index,
                    maximum=len(chunks) - 1,
                ),
            )
        if request.chunk_index not in eligible_indices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=api_message(request.language, 'chunk_not_selected'),
            )
        selected_chunk = chunks[request.chunk_index]
    else:
        selected_chunk = chunks[random.choice(eligible_indices)]

    # --- GERA PERGUNTA VIA GEMINI ---
    try:
        gemini_response = await generate_question(
            selected_chunk,
            request.language,
            request.topic_title,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=api_message(request.language, 'question_generation', error=str(e)),
        )

    return GenerateQuestionResponse(
        question=gemini_response.get("question", ""),
        reference_answer=gemini_response.get("reference_answer", ""),
        chunk_used=selected_chunk,
        topic_title=request.topic_title,
    )
