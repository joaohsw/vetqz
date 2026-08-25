"""
Storage Service — upload e download de arquivos no Supabase Storage.

Gerencia os buckets 'materials' e 'audios'.
"""

import uuid

from app.services.supabase_client import get_supabase_client


def upload_pdf(file_bytes: bytes, original_filename: str) -> str:
    """
    Faz upload do PDF ao bucket 'materials' no Supabase Storage.

    SEGURANÇA: O nome do arquivo é sanitizado com UUID para evitar
    path traversal ou colisão de nomes.

    Args:
        file_bytes: Conteúdo do PDF em bytes.
        original_filename: Nome original do arquivo (usado apenas para extensão).

    Returns:
        Path do arquivo no Storage (ex: "materials/abc123.pdf").
    """
    supabase = get_supabase_client()

    # Sanitiza o nome: UUID + extensão fixa .pdf
    safe_name = f"{uuid.uuid4().hex}.pdf"
    storage_path = f"{safe_name}"

    supabase.storage.from_("materials").upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": "application/pdf"},
    )

    return f"materials/{storage_path}"


def upload_audio(file_bytes: bytes, content_type: str) -> str:
    """
    Faz upload do áudio ao bucket 'audio' no Supabase Storage.

    Args:
        file_bytes: Conteúdo do áudio em bytes.
        content_type: MIME type do áudio (ex: audio/webm).

    Returns:
        Path do arquivo no Storage.
    """
    supabase = get_supabase_client()

    # Remove parâmetros de codec antes de escolher extensão/content-type.
    content_type = content_type.split(";", 1)[0].strip().lower()

    # Determina extensão pelo MIME type
    ext_map = {
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/mp4": ".mp4",
        "audio/mpeg": ".mp3",
    }
    ext = ext_map.get(content_type, ".webm")
    safe_name = f"{uuid.uuid4().hex}{ext}"

    supabase.storage.from_("audios").upload(
        path=safe_name,
        file=file_bytes,
        file_options={"content-type": content_type},
    )

    return f"audios/{safe_name}"
