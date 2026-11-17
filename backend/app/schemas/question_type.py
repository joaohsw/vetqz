"""Question formats shared across session setup, generation, and evaluation."""

from typing import Literal

from pydantic import BaseModel, Field

QuestionType = Literal["descriptive", "multiple_choice"]
DEFAULT_QUESTION_TYPE: QuestionType = "descriptive"

QuestionMode = Literal["descriptive", "multiple_choice", "mixed"]
DEFAULT_QUESTION_MODE: QuestionMode = "descriptive"


class MultipleChoiceOption(BaseModel):
    """Alternativa de uma questão de múltipla escolha."""

    id: str = Field(..., min_length=1, max_length=4)
    text: str = Field(..., min_length=1, max_length=600)
    rationale: str | None = Field(default=None, max_length=600)
