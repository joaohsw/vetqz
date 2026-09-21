"""
PDF Router — endpoint de upload e processamento de PDFs.

SEGURANÇA:
- Validação estrita de MIME type (application/pdf).
- Limite de tamanho configurável via MAX_PDF_SIZE_MB.
- Nome do arquivo sanitizado no Storage Service.
"""

import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.localization import api_message
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.schemas.pdf import (
    CreateUploadIntentRequest,
    CreateUploadIntentResponse,
    ProcessUploadedPDFRequest,
    UploadPDFResponse,
)
from app.services.pdf_service import chunk_pages, extract_text_by_page
from app.services.auth_service import require_current_user
from app.services.supabase_client import get_supabase_client
from app.services.storage_service import delete_pdf, download_pdf, upload_pdf

router = APIRouter()

# MIME types válidos para PDF
ALLOWED_PDF_TYPES = {"application/pdf"}


def process_pdf_bytes(
    file_bytes: bytes,
    filename: str,
    storage_path: str,
    user_id: str,
    language: SupportedLanguage,
) -> UploadPDFResponse:
    """Extrai, fragmenta e registra um PDF que já está no Storage privado."""
    if len(file_bytes) > settings.max_pdf_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=api_message(language, 'pdf_too_large', limit=settings.max_pdf_size_mb),
        )

    try:
        page_texts, num_pages = extract_text_by_page(file_bytes)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(language, 'pdf_processing', error=str(error)),
        ) from error

    if not any(page_texts):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(language, 'pdf_no_text'),
        )

    chunks = chunk_pages(page_texts)
    expires_at = datetime.now(UTC) + timedelta(days=settings.material_retention_days)

    try:
        result = (
            get_supabase_client()
            .table("documents")
            .insert({
                "filename": filename,
                "num_pages": num_pages,
                "chunks": json.dumps(chunks),
                "storage_path": storage_path,
                "user_id": user_id,
                "expires_at": expires_at.isoformat(),
                "original_size_bytes": len(file_bytes),
            })
            .execute()
        )
        document = result.data[0]
    except Exception as error:
        try:
            delete_pdf(storage_path)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, 'pdf_database', error=str(error)),
        ) from error

    return UploadPDFResponse(
        document_id=document["id"],
        filename=document["filename"],
        num_pages=num_pages,
        num_chunks=len(chunks),
    )


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
    user_id: str = Depends(require_current_user),
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

    # --- UPLOAD AO STORAGE ---
    try:
        storage_path = upload_pdf(file_bytes, file.filename or "document.pdf")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, 'pdf_storage', error=str(e)),
        )

    return process_pdf_bytes(
        file_bytes,
        file.filename or "document.pdf",
        storage_path,
        user_id,
        language,
    )


@router.post(
    "/upload-intents",
    response_model=CreateUploadIntentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Autoriza um upload direto de PDF ao Storage",
)
async def create_upload_intent_endpoint(
    request: CreateUploadIntentRequest,
    user_id: str = Depends(require_current_user),
):
    """Cria uma autorização curta para o navegador enviar um único PDF privado."""
    if request.size_bytes > settings.max_pdf_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=api_message(request.language, 'pdf_too_large', limit=settings.max_pdf_size_mb),
        )
    if not request.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=api_message(request.language, 'unsupported_pdf', content_type="filename"),
        )

    upload_id = str(uuid.uuid4())
    storage_path = f"materials/{user_id}/{uuid.uuid4().hex}.pdf"
    expires_at = datetime.now(UTC) + timedelta(hours=1)
    try:
        get_supabase_client().table("upload_intents").insert({
            "id": upload_id,
            "user_id": user_id,
            "filename": request.filename,
            "original_size_bytes": request.size_bytes,
            "storage_path": storage_path,
            "expires_at": expires_at.isoformat(),
        }).execute()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(request.language, 'pdf_database', error=str(error)),
        ) from error

    return CreateUploadIntentResponse(upload_id=upload_id, storage_path=storage_path)


@router.post(
    "/process-upload",
    response_model=UploadPDFResponse,
    summary="Processa um PDF enviado diretamente ao Storage",
)
async def process_uploaded_pdf_endpoint(
    request: ProcessUploadedPDFRequest,
    user_id: str = Depends(require_current_user),
):
    """Confirma um intent do próprio aluno, baixa o PDF privado e o processa."""
    supabase = get_supabase_client()
    intent_result = (
        supabase.table("upload_intents")
        .select("id, filename, storage_path, expires_at")
        .eq("id", request.upload_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not intent_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O envio expirou ou não pertence à sua conta. Selecione o PDF novamente.",
        )

    intent = intent_result.data[0]
    if datetime.fromisoformat(intent["expires_at"].replace("Z", "+00:00")) <= datetime.now(UTC):
        try:
            delete_pdf(intent["storage_path"])
        finally:
            supabase.table("upload_intents").delete().eq("id", intent["id"]).execute()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="O envio expirou. Selecione o PDF novamente.",
        )

    try:
        file_bytes = download_pdf(intent["storage_path"])
        response = process_pdf_bytes(
            file_bytes,
            intent["filename"],
            intent["storage_path"],
            user_id,
            request.language,
        )
    except HTTPException:
        try:
            delete_pdf(intent["storage_path"])
        except Exception:
            pass
        raise
    except Exception as error:
        try:
            delete_pdf(intent["storage_path"])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(request.language, 'pdf_processing', error=str(error)),
        ) from error
    finally:
        try:
            supabase.table("upload_intents").delete().eq("id", intent["id"]).execute()
        except Exception as error:
            print(f"[vetQz] Could not clear upload intent {intent['id']}: {error}")

    return response


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um documento e seu PDF do storage",
    description="Deleta o registro do documento e remove o arquivo do Supabase Storage.",
)
async def delete_document_endpoint(
    document_id: str,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
    user_id: str = Depends(require_current_user),
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
        .eq("user_id", user_id)
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
        (
            supabase.table("documents")
            .delete()
            .eq("id", document_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=api_message(language, "document_delete_failed", error=str(e)),
        )

