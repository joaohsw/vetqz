"""
Schemas Pydantic para operações com PDF.
"""

from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """Trecho extraído de uma página específica do PDF."""

    text: str = Field(..., description="Texto extraído do documento")
    page_number: int | None = Field(
        None,
        ge=1,
        description="Página do PDF que originou este trecho",
    )


class SourceReference(BaseModel):
    """Fonte rastreável usada para criar uma pergunta e corrigir a resposta."""

    excerpt: str = Field(..., description="Trecho do material usado como base")
    page_number: int | None = Field(None, ge=1, description="Página de origem do trecho")


class UploadPDFResponse(BaseModel):
    """Resposta do endpoint POST /api/upload-pdf."""
    document_id: str = Field(..., description="UUID do documento no Supabase")
    filename: str = Field(..., description="Nome original do arquivo")
    num_pages: int = Field(..., description="Número de páginas do PDF")
    chunks: list[DocumentChunk] = Field(..., description="Trechos extraídos, com a página de origem")
