"""
Schemas Pydantic para operações com PDF.
"""

from pydantic import BaseModel, Field


class UploadPDFResponse(BaseModel):
    """Resposta do endpoint POST /api/upload-pdf."""
    document_id: str = Field(..., description="UUID do documento no Supabase")
    filename: str = Field(..., description="Nome original do arquivo")
    num_pages: int = Field(..., description="Número de páginas do PDF")
    chunks: list[str] = Field(..., description="Trechos de texto extraídos do PDF")
