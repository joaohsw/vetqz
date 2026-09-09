"""
PDF Router — endpoint de upload e processamento de PDFs.

SEGURANÇA:
- Validação estrita de MIME type (application/pdf).
- Limite de tamanho configurável via MAX_PDF_SIZE_MB.
- Nome do arquivo sanitizado no Storage Service.
"""

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.localization import api_message
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.schemas.pdf import UploadPDFResponse
from app.services.pdf_service import chunk_pages, extract_text_by_page
from app.services.supabase_client import get_supabase_client
from app.services.storage_service import upload_pdf, delete_pdf

router = APIRouter()

# MIME types válidos para PDF
ALLOWED_PDF_TYPES = {"application/pdf"}


@router.post(
    "/upload-pdf",
    response_model=UploadPDFResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload e processamento de PDF",
    description="Recebe um PDF, extrai texto, divide em chunks e persiste no Supabase.",
)
async def upload_pdf_endpoint(
    file: UploadFile = File(...),
    language: SupportedLanguage = Form(DEFAULT_LANGUAGE),
):
    """
    Pipeline de upload:
    1. Valida MIME type e tamanho.
    2. Extrai texto com pypdf.
    3. Divide em chunks com overlap.
    4. Salva PDF no Supabase Storage.
    5. Persiste metadata + chunks na tabela 'documents'.
    """

    # --- VALIDAÇÃO: MIME type ---
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=api_message(
                language,
                'unsupported_pdf',
                content_type=file.content_type,
            ),
        )

    # --- VALIDAÇÃO: Tamanho do arquivo ---
    file_bytes = await file.read()
    if len(file_bytes) > settings.max_pdf_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=api_message(language, 'pdf_too_large', limit=settings.max_pdf_size_mb),
        )

    # --- EXTRAÇÃO DE TEXTO ---
    try:
        page_texts, num_pages = extract_text_by_page(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(language, 'pdf_processing', error=str(e)),
        )

    if not any(page_texts):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(language, 'pdf_no_text'),
        )

    # --- CHUNKING ---
    chunks = chunk_pages(page_texts)

    # --- UPLOAD AO STORAGE ---
    try:
        storage_path = upload_pdf(file_bytes, file.filename or "document.pdf")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, 'pdf_storage', error=str(e)),
        )

    # --- PERSISTÊNCIA NO BANCO ---
    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("documents")
            .insert({
                "filename": file.filename or "document.pdf",
                "num_pages": num_pages,
                "chunks": json.dumps(chunks),  # JSONB
                "storage_path": storage_path,
            })
            .execute()
        )
        document = result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, 'pdf_database', error=str(e)),
        )

    return UploadPDFResponse(
        document_id=document["id"],
        filename=document["filename"],
        num_pages=num_pages,
        num_chunks=len(chunks),
    )


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um documento e seu PDF do storage",
    description="Deleta o registro do documento e remove o arquivo do Supabase Storage.",
)
async def delete_document_endpoint(
    document_id: str,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
):
    """
    Pipeline de deleção:
    1. Busca o documento pelo ID para obter o storage_path.
    2. Remove o arquivo do Supabase Storage.
    3. Remove o registro da tabela 'documents'.
    """
    supabase = get_supabase_client()

    # --- BUSCA DO DOCUMENTO ---
    result = (
        supabase.table("documents")
        .select("id, storage_path")
        .eq("id", document_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=api_message(language, "document_not_found", document_id=document_id),
        )

    document = result.data[0]
    storage_path = document.get("storage_path", "")

    # --- REMOÇÃO DO STORAGE ---
    if storage_path:
        try:
            delete_pdf(storage_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=api_message(language, "document_storage_delete_failed", error=str(e)),
            )

    # --- REMOÇÃO DO BANCO ---
    try:
        supabase.table("documents").delete().eq("id", document_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, "document_delete_failed", error=str(e)),
        )

