"""
Schemas Pydantic para operações com PDF.
"""

from pydantic import BaseModel, Field

from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage


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
    num_chunks: int = Field(..., description="Número de trechos extraídos do PDF")


class CreateUploadIntentRequest(BaseModel):
    """Metadata validada antes do navegador enviar o PDF ao Storage."""

    filename: str = Field(..., min_length=1, max_length=255)
    size_bytes: int = Field(..., gt=0)
    language: SupportedLanguage = DEFAULT_LANGUAGE


class CreateUploadIntentResponse(BaseModel):
    """Caminho temporariamente autorizado para upload direto ao Storage."""

    upload_id: str
    storage_path: str


class ProcessUploadedPDFRequest(BaseModel):
    """Confirma um upload direto e inicia a extração do PDF."""

    upload_id: str = Field(..., min_length=1)
    language: SupportedLanguage = DEFAULT_LANGUAGE
