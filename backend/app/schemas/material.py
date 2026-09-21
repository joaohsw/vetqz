"""Schemas para materiais temporários e a limpeza de retenção."""

from datetime import datetime

from pydantic import BaseModel, Field


class StudyMaterialResponse(BaseModel):
    """Resumo seguro de um PDF disponível temporariamente ao aluno."""

    id: str
    filename: str
    num_pages: int = Field(ge=0)
    created_at: datetime | None = None
    expires_at: datetime


class CleanupExpiredMaterialsResponse(BaseModel):
    """Resultado da rotina diária de remoção de arquivos temporários."""

    deleted_documents: int = 0
    deleted_audio: int = 0
    deleted_upload_intents: int = 0
    failed_documents: int = 0
    failed_audio: int = 0
    failed_upload_intents: int = 0
