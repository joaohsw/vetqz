"""
Question Router — endpoint de geração de perguntas via Gemini.
"""

import json
import random

from fastapi import APIRouter, HTTPException, status

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
            detail=f"Documento não encontrado: {request.document_id}",
        )

    document = result.data[0]
    chunks = json.loads(document["chunks"]) if isinstance(document["chunks"], str) else document["chunks"]

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O documento não possui chunks de texto. "
                   "O PDF pode estar vazio ou corrompido.",
        )

    # --- SELECIONA CHUNK ---
    if request.chunk_index is not None:
        if request.chunk_index < 0 or request.chunk_index >= len(chunks):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"chunk_index {request.chunk_index} fora do range "
                       f"[0, {len(chunks) - 1}].",
            )
        selected_chunk = chunks[request.chunk_index]
    else:
        selected_chunk = random.choice(chunks)

    # --- GERA PERGUNTA VIA GEMINI ---
    try:
        gemini_response = await generate_question(selected_chunk)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao gerar pergunta com o Gemini: {str(e)}",
        )

    return GenerateQuestionResponse(
        question=gemini_response.get("question", ""),
        reference_answer=gemini_response.get("reference_answer", ""),
        chunk_used=selected_chunk,
    )
