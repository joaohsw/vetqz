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

