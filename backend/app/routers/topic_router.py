"""Endpoint para construir um mapa dinâmico de assuntos de uma unidade."""

import json

from fastapi import APIRouter, HTTPException, status

from app.localization import api_message
from app.schemas.topic import AnalyzeTopicsRequest, AnalyzeTopicsResponse
from app.services.gemini_service import analyze_topics
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.post(
    "/analyze-topics",
    response_model=AnalyzeTopicsResponse,
    summary="Identifica os assuntos de uma unidade",
    description="Monta um mapa variável de assuntos a partir dos trechos extraídos do PDF.",
)
async def analyze_topics_endpoint(request: AnalyzeTopicsRequest):
    """Busca o documento e cria assuntos vinculados aos trechos que os fundamentam."""
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
                "document_not_found",
                document_id=request.document_id,
            ),
        )

    document = result.data[0]
    chunks = json.loads(document["chunks"]) if isinstance(document["chunks"], str) else document["chunks"]
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(request.language, "document_no_chunks"),
        )

    try:
        topics = await analyze_topics(chunks, request.language)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=api_message(request.language, "topic_analysis", error=str(error)),
        )

    return AnalyzeTopicsResponse(topics=topics)
