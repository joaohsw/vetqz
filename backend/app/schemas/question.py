"""
Schemas Pydantic para geração de perguntas.
"""

from pydantic import BaseModel, Field

from app.schemas.difficulty import DEFAULT_DIFFICULTY, Difficulty
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.schemas.pdf import SourceReference


class GenerateQuestionRequest(BaseModel):
    """Request para POST /api/generate-question."""
    document_id: str = Field(..., description="UUID do documento fonte")
    language: SupportedLanguage = Field(
        DEFAULT_LANGUAGE,
        description="Idioma da pergunta e da resposta: pt-BR ou es-CL",
    )
    chunk_index: int | None = Field(
        None,
        description="Índice do chunk a usar. Se None, seleciona aleatoriamente.",
    )
    chunk_indices: list[int] | None = Field(
        None,
        description="Trechos elegíveis para a pergunta. Limita a geração aos assuntos escolhidos.",
    )
    topic_title: str | None = Field(
        None,
        max_length=180,
        description="Assunto em foco, usado para manter a pergunta alinhada à sessão.",
    )
    difficulty: Difficulty = Field(
        DEFAULT_DIFFICULTY,
        description="Dificuldade da pergunta: easy, medium ou hard.",
    )


class GenerateQuestionResponse(BaseModel):
    """Response de POST /api/generate-question."""
    question: str = Field(..., description="Pergunta gerada pela IA")
    reference_answer: str = Field(..., description="Resposta de referência da IA")
    chunk_used: str = Field(..., description="Trecho do PDF usado como contexto")
    topic_title: str | None = Field(None, description="Assunto selecionado para a pergunta")
    difficulty: Difficulty = Field(..., description="Dificuldade usada para gerar a pergunta")
    chunk_index: int = Field(..., ge=0, description="Índice do trecho usado no documento")
    source: SourceReference = Field(..., description="Fonte rastreável da pergunta")
