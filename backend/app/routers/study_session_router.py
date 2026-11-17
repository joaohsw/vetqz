"""Criação e finalização de sessões de estudo para o histórico do aluno."""

from datetime import UTC, datetime
import json

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.localization import api_message, resolve_language
from app.schemas.language import SupportedLanguage
from app.schemas.question_type import DEFAULT_QUESTION_MODE, DEFAULT_QUESTION_TYPE
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

_MC_SESSION_COLUMNS = ("question_mode",)
_MC_ATTEMPT_COLUMNS = ("question_type", "options", "correct_option_id", "selected_option_id")


def _is_missing_column_error(error: Exception, columns: tuple[str, ...]) -> bool:
    message = str(error)
    return any(column in message for column in columns) and (
        "PGRST204" in message or "42703" in message or "column" in message.lower()
    )


@router.get(
    "/study-sessions",
    response_model=list[StudySessionHistoryResponse],
    summary="Lista o histórico de sessões de estudo",
)
async def list_study_sessions_endpoint(
    user_id: str = Depends(require_current_user),
    session_id: str | None = None,
    language: SupportedLanguage | None = None,
    accept_language: str | None = Header(default=None),
):
    """Agrupa respostas por sessão e entrega somente o histórico do aluno atual."""
    resolved_language = resolve_language(language, accept_language)
    supabase = get_supabase_client()
    try:
        base_session_columns = (
            "id, document_id, document_filename, topic_titles, planned_question_count, "
            "difficulty, feedback_mode, status, started_at, completed_at"
        )
        try:
            sessions_query = (
                supabase.table("study_sessions")
                .select(f"{base_session_columns}, question_mode")
                .eq("user_id", user_id)
                .order("started_at", desc=True)
                .limit(20)
            )
            if session_id:
                sessions_query = sessions_query.eq("id", session_id)
            sessions = sessions_query.execute().data or []
        except Exception as error:
            if not _is_missing_column_error(error, _MC_SESSION_COLUMNS):
                raise
            sessions_query = (
                supabase.table("study_sessions")
                .select(base_session_columns)
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
        base_attempt_columns = (
            "id, study_session_id, score, question, reference_answer, topic_title, "
            "question_position, source_excerpt, source_page, created_at, updated_at, "
            "student_answer, feedback, model_answer"
        )
        attempt_columns = f"{base_attempt_columns}, question_type, options, correct_option_id, selected_option_id"
        offset = 0
        while True:
            try:
                page = (
                    supabase.table("quiz_sessions")
                    .select(attempt_columns)
                    .eq("user_id", user_id)
                    .in_("study_session_id", session_ids)
                    .order("id")
                    .range(offset, offset + 199)
                    .execute()
                ).data or []
            except Exception as error:
                if attempt_columns == base_attempt_columns or not _is_missing_column_error(error, _MC_ATTEMPT_COLUMNS):
                    raise
                attempt_columns = base_attempt_columns
                continue
            attempts.extend(page)
            if not page:
                break
            offset += len(page)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(resolved_language, "study_history_load_failed"),
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
        raw_options = attempt.get("options")
        if isinstance(raw_options, str):
            try:
                raw_options = json.loads(raw_options)
            except json.JSONDecodeError:
                raw_options = []
        return StudySessionAttemptResponse(**{
            **{key: value for key, value in attempt.items() if key in StudySessionAttemptResponse.model_fields},
            "score": attempt.get("score") if valid_score(attempt.get("score")) else None,
            "student_answer": attempt.get("student_answer") or "",
            "feedback": attempt.get("feedback") or "",
            "model_answer": attempt.get("model_answer") or "",
            "question_type": attempt.get("question_type") or DEFAULT_QUESTION_TYPE,
            "options": raw_options if isinstance(raw_options, list) else [],
            "correct_option_id": attempt.get("correct_option_id"),
            "selected_option_id": attempt.get("selected_option_id"),
        })

    return [
        StudySessionHistoryResponse(
            id=session["id"],
            document_id=session.get("document_id"),
            document_filename=session["document_filename"],
            topic_titles=session.get("topic_titles") or [],
            planned_question_count=session["planned_question_count"],
            difficulty=session.get("difficulty", "medium"),
            question_mode=session.get("question_mode") or DEFAULT_QUESTION_MODE,
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
    language: SupportedLanguage | None = None,
    accept_language: str | None = Header(default=None),
    user_id: str = Depends(require_current_user),
):
    resolved_language = resolve_language(language, accept_language)
    sessions = await list_study_sessions_endpoint(
        user_id=user_id,
        session_id=study_session_id,
        language=resolved_language,
    )
    if not sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=api_message(resolved_language, "study_session_not_found"),
        )
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
    session_payload = {
        "user_id": user_id,
        "document_id": document["id"],
        "document_filename": document["filename"],
        "topic_titles": request.topic_titles,
        "planned_question_count": request.planned_question_count,
        "difficulty": request.difficulty,
        "question_mode": request.question_mode,
        "feedback_mode": request.feedback_mode,
        "language": request.language,
    }
    try:
        try:
            result = supabase.table("study_sessions").insert(session_payload).execute()
        except Exception as error:
            if not _is_missing_column_error(error, _MC_SESSION_COLUMNS):
                raise
            legacy_payload = {k: v for k, v in session_payload.items() if k != "question_mode"}
            result = supabase.table("study_sessions").insert(legacy_payload).execute()
        study_session = result.data[0]
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(request.language, "study_session_create_failed"),
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
    language: SupportedLanguage | None = None,
    accept_language: str | None = Header(default=None),
    user_id: str = Depends(require_current_user),
):
    """Finaliza a sessão sem apagar seu histórico de tentativas."""
    resolved_language = resolve_language(language, accept_language)
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
            detail=api_message(resolved_language, "study_session_not_found"),
        )
