"""Materiais recentes do aluno e limpeza automatizada de arquivos expirados."""

from datetime import UTC, datetime
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import settings
from app.schemas.material import CleanupExpiredMaterialsResponse, StudyMaterialResponse
from app.services.auth_service import require_current_user
from app.services.storage_service import delete_audio, delete_pdf
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.get(
    "/materials",
    response_model=list[StudyMaterialResponse],
    summary="Lista os materiais temporários do aluno",
)
async def list_materials_endpoint(
    user_id: str = Depends(require_current_user),
):
    """Mostra somente PDFs ainda disponíveis e pertencentes ao usuário atual."""
    now = datetime.now(UTC).isoformat()
    try:
        result = (
            get_supabase_client()
            .table("documents")
            .select("id, filename, num_pages, created_at, expires_at")
            .eq("user_id", user_id)
            .gt("expires_at", now)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return result.data or []
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar seus materiais recentes.",
        ) from error


def require_cron_secret(authorization: str | None = Header(default=None)) -> None:
    """Autoriza exclusivamente o Vercel Cron; nunca expõe a limpeza ao público."""
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A limpeza automática ainda não foi configurada.",
        )

    expected = f"Bearer {settings.cron_secret}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autorizado.",
        )


@router.get(
    "/internal/cleanup-expired-materials",
    response_model=CleanupExpiredMaterialsResponse,
    summary="Remove PDFs e áudios que passaram do prazo de retenção",
    include_in_schema=False,
)
async def cleanup_expired_materials_endpoint(
    _: None = Depends(require_cron_secret),
):
    """Apaga arquivos do Storage e só então remove/atualiza suas referências."""
    supabase = get_supabase_client()
    now = datetime.now(UTC).isoformat()
    result = CleanupExpiredMaterialsResponse()

    expired_documents = (
        supabase.table("documents")
        .select("id, storage_path")
        .lte("expires_at", now)
        .execute()
    )
    for document in expired_documents.data or []:
        try:
            storage_path = document.get("storage_path")
            if storage_path:
                delete_pdf(storage_path)
            supabase.table("documents").delete().eq("id", document["id"]).execute()
            result.deleted_documents += 1
        except Exception as error:
            print(f"[vetQz] Could not remove expired document {document.get('id')}: {error}")
            result.failed_documents += 1

    expired_audio = (
        supabase.table("quiz_sessions")
        .select("id, audio_path")
        .not_.is_("audio_path", "null")
        .lte("audio_expires_at", now)
        .execute()
    )
    for session in expired_audio.data or []:
        try:
            delete_audio(session["audio_path"])
            (
                supabase.table("quiz_sessions")
                .update({"audio_path": None, "audio_expires_at": None})
                .eq("id", session["id"])
                .execute()
            )
            result.deleted_audio += 1
        except Exception as error:
            print(f"[vetQz] Could not remove expired audio {session.get('id')}: {error}")
            result.failed_audio += 1

    expired_intents = (
        supabase.table("upload_intents")
        .select("id, storage_path")
        .lte("expires_at", now)
        .execute()
    )
    for intent in expired_intents.data or []:
        try:
            delete_pdf(intent["storage_path"])
            supabase.table("upload_intents").delete().eq("id", intent["id"]).execute()
            result.deleted_upload_intents += 1
        except Exception as error:
            print(f"[vetQz] Could not remove expired upload intent {intent.get('id')}: {error}")
            result.failed_upload_intents += 1

    return result
