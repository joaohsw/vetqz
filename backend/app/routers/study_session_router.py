"""Criação e finalização de sessões de estudo para o histórico do aluno."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.localization import api_message
from app.schemas.study_session import (
    CreateStudySessionRequest,
    StudySessionAttemptResponse,
    StudySessionHistoryResponse,
    StudySessionResponse,
)
from app.services.auth_service import require_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter()


@router.get(
    "/study-sessions",
    response_model=list[StudySessionHistoryResponse],
    summary="Lista o histórico de sessões de estudo",
)
async def list_study_sessions_endpoint(
    user_id: str = Depends(require_current_user),
):
    """Agrupa respostas por sessão e entrega somente o histórico do aluno atual."""
    supabase = get_supabase_client()
    try:
        sessions_result = (
            supabase.table("study_sessions")
            .select(
                "id, document_id, document_filename, topic_titles, planned_question_count, "
                "difficulty, feedback_mode, status, started_at, completed_at"
            )
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .limit(20)
            .execute()
        )
        sessions = sessions_result.data or []
        if not sessions:
            return []

        session_ids = [session["id"] for session in sessions]
        attempts_result = (
            supabase.table("quiz_sessions")
            .select(
                "id, study_session_id, score, question, reference_answer, topic_title, "
                "question_position, source_excerpt, source_page, created_at"
            )
            .eq("user_id", user_id)
            .in_("study_session_id", session_ids)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar seu histórico de estudos.",
        ) from error

    scores_by_session: dict[str, list[float]] = {session_id: [] for session_id in session_ids}
    attempts_by_session: dict[str, list[dict]] = {session_id: [] for session_id in session_ids}
    latest_attempt_by_session: dict[str, dict] = {}
    for attempt in attempts_result.data or []:
        session_id = attempt.get("study_session_id")
        score = attempt.get("score")
        if session_id in scores_by_session and isinstance(score, (int, float)):
            scores_by_session[session_id].append(float(score))
        if session_id in attempts_by_session:
            attempts_by_session[session_id].append(attempt)
        if session_id in latest_attempt_by_session:
            continue
        if session_id in scores_by_session:
            latest_attempt_by_session[session_id] = attempt

    return [
        StudySessionHistoryResponse(
            id=session["id"],
            document_id=session.get("document_id"),
            document_filename=session["document_filename"],
            topic_titles=session.get("topic_titles") or [],
            planned_question_count=session["planned_question_count"],
            difficulty=session.get("difficulty", "medium"),
            feedback_mode=session.get("feedback_mode", "immediate"),
            answered_question_count=len(scores_by_session[session["id"]]),
            average_score=(
                round(sum(scores_by_session[session["id"]]) / len(scores_by_session[session["id"]]), 1)
                if scores_by_session[session["id"]] else None
            ),
            attempts=[
                StudySessionAttemptResponse(
                    id=attempt["id"],
                    question=attempt["question"],
                    reference_answer=attempt["reference_answer"],
                    topic_title=attempt.get("topic_title"),
                    question_position=attempt.get("question_position"),
                    source_excerpt=attempt.get("source_excerpt"),
                    source_page=attempt.get("source_page"),
                )
                for attempt in sorted(
                    attempts_by_session[session["id"]],
                    key=lambda attempt: (attempt.get("question_position") or 0, attempt.get("created_at") or ""),
                )
            ],
            last_attempt=(
                StudySessionAttemptResponse(
                    id=latest_attempt_by_session[session["id"]]["id"],
                    question=latest_attempt_by_session[session["id"]]["question"],
                    reference_answer=latest_attempt_by_session[session["id"]]["reference_answer"],
                    topic_title=latest_attempt_by_session[session["id"]].get("topic_title"),
                    question_position=latest_attempt_by_session[session["id"]].get("question_position"),
                    source_excerpt=latest_attempt_by_session[session["id"]].get("source_excerpt"),
                    source_page=latest_attempt_by_session[session["id"]].get("source_page"),
                )
                if session["id"] in latest_attempt_by_session else None
            ),
            status=session["status"],
            started_at=session["started_at"],
            completed_at=session.get("completed_at"),
        )
        for session in sessions
    ]


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
