"""
Schemas Pydantic para avaliação de respostas.
"""

from pydantic import BaseModel, Field

from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage


class EvaluateAnswerRequest(BaseModel):
    """Request para POST /api/evaluate-answer (modo texto)."""
    question: str = Field(..., description="Pergunta que foi apresentada ao aluno")
    reference_answer: str = Field(..., description="Resposta de referência gerada pela IA")
    student_answer: str = Field(..., description="Resposta do aluno (transcrição ou texto)")
    language: SupportedLanguage = Field(
        DEFAULT_LANGUAGE,
        description="Idioma da avaliação: pt-BR ou es-CL",
    )


class EvaluateAnswerResponse(BaseModel):
    """Response de POST /api/evaluate-answer."""
    score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Nota de 0.0 a 10.0",
    )
    feedback: str = Field(..., description="Feedback detalhado sobre a resposta do aluno")
    model_answer: str = Field(..., description="Resposta exemplar completa")
