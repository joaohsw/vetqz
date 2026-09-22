"""Schemas para registrar sessões de estudo e prepará-las para o histórico."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.difficulty import DEFAULT_DIFFICULTY, Difficulty
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage

FeedbackMode = Literal["immediate", "final"]


class CreateStudySessionRequest(BaseModel):
    document_id: str
    topic_titles: list[str] = Field(..., min_length=1, max_length=20)
    planned_question_count: int = Field(..., ge=1, le=20)
    difficulty: Difficulty = DEFAULT_DIFFICULTY
    feedback_mode: FeedbackMode = "immediate"
    language: SupportedLanguage = DEFAULT_LANGUAGE


class StudySessionResponse(BaseModel):
    id: str
    document_filename: str
    started_at: datetime


class StudySessionAttemptResponse(BaseModel):
    """Última questão respondida, usada para retomá-la sem gerar outra."""

    id: str
    question: str
    reference_answer: str
    topic_title: str | None = None
    question_position: int | None = Field(default=None, ge=1)
    source_excerpt: str | None = None
    source_page: int | None = Field(default=None, ge=1)


class StudySessionHistoryResponse(BaseModel):
    """Resumo de uma sessão para a área de histórico da conta."""

    id: str
    document_id: str | None = None
    document_filename: str
    topic_titles: list[str] = Field(default_factory=list)
    planned_question_count: int = Field(ge=1)
    difficulty: Difficulty = DEFAULT_DIFFICULTY
    feedback_mode: FeedbackMode = "immediate"
    answered_question_count: int = Field(ge=0)
    average_score: float | None = Field(default=None, ge=0, le=10)
    attempts: list[StudySessionAttemptResponse] = Field(default_factory=list)
    last_attempt: StudySessionAttemptResponse | None = None
    status: Literal["active", "completed"]
    started_at: datetime
    completed_at: datetime | None = None
