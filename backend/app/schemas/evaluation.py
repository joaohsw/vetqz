"""
Schemas Pydantic para avaliação de respostas.
"""

from pydantic import BaseModel, Field

from app.schemas.difficulty import DEFAULT_DIFFICULTY, Difficulty
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.schemas.pdf import SourceReference
from app.schemas.question_type import (
    DEFAULT_QUESTION_TYPE,
    MultipleChoiceOption,
    QuestionType,
)


class EvaluateAnswerRequest(BaseModel):
    """Request para POST /api/evaluate-answer (modo texto)."""
    question: str = Field(..., description="Pergunta que foi apresentada ao aluno")
    reference_answer: str = Field(..., description="Resposta de referência gerada pela IA")
    student_answer: str = Field(..., description="Resposta do aluno (transcrição ou texto)")
    language: SupportedLanguage = Field(
        DEFAULT_LANGUAGE,
        description="Idioma da avaliação: pt-BR ou es-CL",
    )
    difficulty: Difficulty = Field(
        DEFAULT_DIFFICULTY,
        description="Dificuldade da pergunta avaliada: easy, medium ou hard.",
    )


class EvaluateAnswerResponse(BaseModel):
    """Response de POST /api/evaluate-answer."""
    attempt_id: str | None = None
    score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Nota de 0.0 a 10.0",
    )
    feedback: str = Field(..., description="Feedback detalhado sobre a resposta do aluno")
    strengths: list[str] = Field(
        default_factory=list,
        description="Pontos tecnicamente corretos identificados na resposta",
    )
    improvements: list[str] = Field(
        default_factory=list,
        description="Pontos que o estudante deve melhorar",
    )
    next_step: str = Field(
        default="",
        description="Orientação curta para a próxima tentativa",
    )
    model_answer: str = Field(..., description="Resposta exemplar completa")
    question_type: QuestionType = Field(
        DEFAULT_QUESTION_TYPE,
        description="Formato da pergunta avaliada",
    )
    options: list[MultipleChoiceOption] = Field(
        default_factory=list,
        description="Alternativas da questão quando question_type é multiple_choice",
    )
    correct_option_id: str | None = Field(
        default=None,
        description="ID da alternativa correta em múltipla escolha",
    )
    selected_option_id: str | None = Field(
        default=None,
        description="ID da alternativa selecionada pelo aluno em múltipla escolha",
    )
    source: SourceReference | None = Field(
        None,
        description="Trecho e página que fundamentaram a pergunta",
    )
