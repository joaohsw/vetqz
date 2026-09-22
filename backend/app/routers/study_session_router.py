"""Criação e finalização de sessões de estudo para o histórico do aluno."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.localization import api_message
from app.schemas.study_session import CreateStudySessionRequest, StudySessionResponse
from app.services.auth_service import require_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.post(
    "/study-sessions",
    response_model=StudySessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inicia uma sessão de estudo",
)
async def create_study_session_endpoint(
    request: CreateStudySessionRequest,
    user_id: str = Depends(require_current_user),
):
    """Registra a configuração da sessão antes da primeira pergunta."""
    supabase = get_supabase_client()
    document_result = (
        supabase.table("documents")
        .select("id, filename")
        .eq("id", request.document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not document_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=api_message(
                request.language,
                "document_not_found",
                document_id=request.document_id,
            ),
        )

    document = document_result.data[0]
    try:
        result = supabase.table("study_sessions").insert({
            "user_id": user_id,
            "document_id": document["id"],
            "document_filename": document["filename"],
            "topic_titles": request.topic_titles,
            "planned_question_count": request.planned_question_count,
            "difficulty": request.difficulty,
            "feedback_mode": request.feedback_mode,
            "language": request.language,
        }).execute()
        study_session = result.data[0]
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível iniciar sua sessão de estudo.",
        ) from error

    return StudySessionResponse(
        id=study_session["id"],
        document_filename=study_session["document_filename"],
        started_at=study_session["started_at"],
    )


@router.post(
    "/study-sessions/{study_session_id}/complete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marca uma sessão de estudo como concluída",
)
async def complete_study_session_endpoint(
    study_session_id: str,
    user_id: str = Depends(require_current_user),
):
    """Finaliza a sessão sem apagar seu histórico de tentativas."""
    result = (
        get_supabase_client()
        .table("study_sessions")
        .update({"status": "completed", "completed_at": datetime.now(UTC).isoformat()})
        .eq("id", study_session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de estudo não encontrada.",
        )
