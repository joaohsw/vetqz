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
from app.services.study_metrics import attempt_order, session_metrics, valid_score
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
    session_id: str | None = None,
):
    """Agrupa respostas por sessão e entrega somente o histórico do aluno atual."""
    supabase = get_supabase_client()
    try:
        sessions_query = (
            supabase.table("study_sessions")
            .select(
                "id, document_id, document_filename, topic_titles, planned_question_count, "
                "difficulty, feedback_mode, status, started_at, completed_at"
            )
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .limit(20)
        )
        if session_id:
            sessions_query = sessions_query.eq("id", session_id)
        sessions = sessions_query.execute().data or []
        if not sessions:
            return []

        session_ids = [session["id"] for session in sessions]
        attempts = []
        offset = 0
        while True:
            page = (
                supabase.table("quiz_sessions")
                .select("id, study_session_id, score, question, reference_answer, topic_title, "
                        "question_position, source_excerpt, source_page, created_at, updated_at, "
                        "student_answer, feedback, model_answer")
                .eq("user_id", user_id)
                .in_("study_session_id", session_ids)
                .order("id")
                .range(offset, offset + 199)
                .execute()
            ).data or []
            attempts.extend(page)
            if not page:
                break
            offset += len(page)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível carregar seu histórico de estudos.",
        ) from error

    attempts_by_session = {sid: [] for sid in session_ids}
    for attempt in attempts:
        if attempt.get("study_session_id") in attempts_by_session:
            attempts_by_session[attempt["study_session_id"]].append(attempt)
    metrics = {
        session["id"]: session_metrics(attempts_by_session[session["id"]], session["planned_question_count"])
        for session in sessions
    }

    def response_attempt(attempt):
        return StudySessionAttemptResponse(**{
            **{key: value for key, value in attempt.items() if key in StudySessionAttemptResponse.model_fields},
            "score": attempt.get("score") if valid_score(attempt.get("score")) else None,
            "student_answer": attempt.get("student_answer") or "",
            "feedback": attempt.get("feedback") or "",
            "model_answer": attempt.get("model_answer") or "",
        })

    return [
        StudySessionHistoryResponse(
            id=session["id"],
            document_id=session.get("document_id"),
            document_filename=session["document_filename"],
            topic_titles=session.get("topic_titles") or [],
            planned_question_count=session["planned_question_count"],
            difficulty=session.get("difficulty", "medium"),
            feedback_mode=session.get("feedback_mode", "immediate"),
            answered_question_count=metrics[session["id"]][2],
            average_score=metrics[session["id"]][3],
            attempts=[response_attempt(row) for row in metrics[session["id"]][0]],
            legacy_unplaced_attempts=[response_attempt({**row, "question_position": None}) for row in metrics[session["id"]][1]],
            superseded_attempt_count=(len(attempts_by_session[session["id"]])
                - len(metrics[session["id"]][0]) - len(metrics[session["id"]][1])),
            last_attempt=(response_attempt(max(metrics[session["id"]][0], key=attempt_order))
                if metrics[session["id"]][0] else None),
            status=session["status"],
            started_at=session["started_at"],
            completed_at=session.get("completed_at"),
        )
        for session in sessions
    ]


@router.get("/study-sessions/{study_session_id}", response_model=StudySessionHistoryResponse)
async def get_study_session_endpoint(
    study_session_id: str,
    user_id: str = Depends(require_current_user),
):
    sessions = await list_study_sessions_endpoint(user_id=user_id, session_id=study_session_id)
    if not sessions:
        raise HTTPException(status_code=404, detail="Sessão de estudo não encontrada.")
    return sessions[0]


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
