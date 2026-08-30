"""Schemas para o mapa de assuntos de uma unidade."""

from pydantic import BaseModel, Field

from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage


class StudyTopic(BaseModel):
    """Um assunto identificável no material enviado pelo estudante."""

    id: str = Field(..., description="Identificador estável do assunto na sessão")
    title: str = Field(..., description="Nome curto e acadêmico do assunto")
    summary: str = Field(..., description="Resumo breve do escopo do assunto")
    chunk_indices: list[int] = Field(
        ...,
        min_length=1,
        description="Índices dos trechos do PDF que fundamentam este assunto",
    )


class AnalyzeTopicsRequest(BaseModel):
    """Request para POST /api/analyze-topics."""

    document_id: str = Field(..., description="UUID do documento fonte")
    language: SupportedLanguage = Field(
        DEFAULT_LANGUAGE,
        description="Idioma da interface e dos nomes de assuntos",
    )


class AnalyzeTopicsResponse(BaseModel):
    """Mapa de assuntos identificado a partir do conteúdo real do PDF."""

    topics: list[StudyTopic] = Field(
        ...,
        min_length=1,
        description="Assuntos identificados, sem quantidade pré-definida",
    )
