"""Mapa de assuntos persistido, bilíngue e isolado por proprietário."""

import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.localization import api_message
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.schemas.topic import AnalyzeTopicsRequest, AnalyzeTopicsResponse
from app.services.auth_service import require_current_user
from app.services.gemini_service import analyze_topics, translate_topic_metadata
from app.services.pdf_service import build_topic_chunks, normalize_document_chunks
from app.services.supabase_client import get_supabase_client
from app.services.topic_cache import localized_analysis, make_topic_cache, valid_topic_cache

router = APIRouter()
logger = logging.getLogger(__name__)


def _read_document(supabase, document_id: str, user_id: str, language: SupportedLanguage):
    result = (supabase.table("documents").select("id, chunks, topic_analysis")
              .eq("id", document_id).eq("user_id", user_id).execute())
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=api_message(language, "document_not_found", document_id=document_id))
    document = result.data[0]
    raw = document["chunks"]
    chunks = normalize_document_chunks(json.loads(raw) if isinstance(raw, str) else raw)
    if not chunks:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=api_message(language, "document_no_chunks"))
    return chunks, valid_topic_cache(document.get("topic_analysis"), chunks)


@router.get(
    "/documents/{document_id}/topics",
    response_model=AnalyzeTopicsResponse | None,
    summary="Consulta assuntos salvos sem chamar a IA",
)
async def get_saved_topics_endpoint(
    document_id: str,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
    user_id: str = Depends(require_current_user),
):
    """NULL indica cache ausente/inválido ou tradução ainda não disponível."""
    _, cache = _read_document(get_supabase_client(), document_id, user_id, language)
    return localized_analysis(cache, language)


@router.post(
    "/analyze-topics",
    response_model=AnalyzeTopicsResponse,
    summary="Identifica os assuntos de uma unidade",
    description="Reutiliza o mapa salvo ou analisa uma única vez os trechos extraídos do PDF.",
)
async def analyze_topics_endpoint(
    request: AnalyzeTopicsRequest,
    user_id: str = Depends(require_current_user),
):
    """Consulta o cache mesmo quando o cliente solicita diretamente uma análise."""
    supabase = get_supabase_client()
    chunks, cache = _read_document(supabase, request.document_id, user_id, request.language)
    saved = localized_analysis(cache, request.language)
    if saved:
        return AnalyzeTopicsResponse(**saved)

    lock_id = str(uuid.uuid4())
    deadline = time.monotonic() + 20
    while not supabase.rpc("claim_topic_analysis", {
        "document_id": request.document_id, "owner_id": user_id, "lock_id": lock_id,
    }).execute().data:
        chunks, cache = _read_document(supabase, request.document_id, user_id, request.language)
        saved = localized_analysis(cache, request.language)
        if saved:
            return AnalyzeTopicsResponse(**saved)
        if time.monotonic() >= deadline:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                                headers={"Retry-After": "2"},
                                detail=api_message(request.language, "topic_analysis", error="analysis_in_progress"))
        await asyncio.sleep(0.25)

    def persist(value):
        result = (supabase.table("documents").update({"topic_analysis": value})
                  .eq("id", request.document_id).eq("user_id", user_id)
                  .eq("topic_analysis_lock_id", lock_id).execute())
        if not result.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=api_message(request.language, "document_not_found", document_id=request.document_id))

    async def complete_analysis():
        # Outra instância pode ter finalizado entre a primeira leitura e o lease.
        current_chunks, current_cache = _read_document(supabase, request.document_id, user_id, request.language)
        saved = localized_analysis(current_cache, request.language)
        if saved:
            return saved
        if current_cache is None:
            topic_chunks = build_topic_chunks(current_chunks)
            if not topic_chunks:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail=api_message(request.language, "document_no_chunks"))
            analysis = await analyze_topics(topic_chunks, request.language)
            current_cache = make_topic_cache(analysis, current_chunks)
            if not valid_topic_cache(current_cache, current_chunks):
                raise ValueError("Mapa de assuntos inválido")
            # Preservar análise mesmo se a tradução de fallback falhar depois.
            persist(current_cache)
        saved = localized_analysis(current_cache, request.language)
        if not saved:
            current_cache = {**current_cache, "topics": await translate_topic_metadata(current_cache["topics"], request.language)}
            persist(current_cache)
            saved = localized_analysis(current_cache, request.language)
        return saved

    try:
        # Menor que o lease de 120s; uma falha não bloqueia o documento para sempre.
        analysis = await asyncio.wait_for(complete_analysis(), timeout=90)
        return AnalyzeTopicsResponse(**analysis)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=api_message(request.language, "topic_analysis", error=str(error))) from error
    finally:
        try:
            (supabase.table("documents").update({"topic_analysis_lock_id": None, "topic_analysis_lock_until": None})
             .eq("id", request.document_id).eq("user_id", user_id)
             .eq("topic_analysis_lock_id", lock_id).execute())
        except Exception:
            logger.warning("Could not release topic analysis lease; it will expire automatically")
