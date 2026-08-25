"""
Schemas Pydantic para geração de perguntas.
"""

from pydantic import BaseModel, Field


class GenerateQuestionRequest(BaseModel):
    """Request para POST /api/generate-question."""
    document_id: str = Field(..., description="UUID do documento fonte")
    chunk_index: int | None = Field(
        None,
        description="Índice do chunk a usar. Se None, seleciona aleatoriamente.",
    )


class GenerateQuestionResponse(BaseModel):
    """Response de POST /api/generate-question."""
    question: str = Field(..., description="Pergunta gerada pela IA")
    reference_answer: str = Field(..., description="Resposta de referência da IA")
    chunk_used: str = Field(..., description="Trecho do PDF usado como contexto")
