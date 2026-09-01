"""Extração de PDF com trechos rastreáveis até a página de origem."""

import io
import re
from collections.abc import Iterable

from pypdf import PdfReader


def extract_text_by_page(file_bytes: bytes) -> tuple[list[str], int]:
    """Extrai o texto de cada página, preservando a ordem do documento."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        page_text = page.extract_text()
        pages.append(page_text.strip() if page_text else "")
    return pages, len(reader.pages)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Divide um texto em trechos com sobreposição, sem atravessar páginas."""
    if not text or not text.strip():
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        chunk = text[start:start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def chunk_pages(page_texts: Iterable[str]) -> list[dict[str, int | str]]:
    """Cria trechos indexáveis, cada um ligado à página da qual foi extraído."""
    chunks: list[dict[str, int | str]] = []
    for page_number, text in enumerate(page_texts, start=1):
        for text_chunk in chunk_text(text):
            chunks.append({"text": text_chunk, "page_number": page_number})
    return chunks


def normalize_document_chunks(raw_chunks: object) -> list[dict[str, int | str | None]]:
    """Normaliza documentos antigos (lista de textos) e novos (texto + página)."""
    if not isinstance(raw_chunks, list):
        return []

    normalized: list[dict[str, int | str | None]] = []
    for raw_chunk in raw_chunks:
        if isinstance(raw_chunk, str):
            text = raw_chunk.strip()
            if text:
                normalized.append({"text": text, "page_number": None})
            continue

        if not isinstance(raw_chunk, dict):
            continue
        text = str(raw_chunk.get("text", "")).strip()
        page_number = raw_chunk.get("page_number")
        if not text:
            continue
        normalized.append({
            "text": text,
            "page_number": page_number if isinstance(page_number, int) and page_number > 0 else None,
        })

    return normalized


def is_likely_table_of_contents(text: str) -> bool:
    """Identifica índices/sumários para não usá-los como base de perguntas."""
    normalized = " ".join(text.split())
    opening = normalized[:180].casefold()
    if any(marker in opening for marker in ("sumário", "sumario", "índice", "indice", "table of contents")):
        return True

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) < 6:
        return False

    numbered_lines = sum(
        bool(re.search(r"(?:\b\d{1,3}\b|\b[ivxlcdm]+\b)\s*$", line, re.IGNORECASE))
        for line in lines
    )
    short_lines = sum(len(line) < 110 for line in lines)
    return numbered_lines / len(lines) >= 0.55 and short_lines / len(lines) >= 0.7


def validate_source_excerpt(excerpt: object, context: str) -> str:
    """Aceita apenas uma citação curta que exista no trecho usado pela pergunta."""
    candidate = str(excerpt or "").strip()[:420]
    normalized_candidate = " ".join(candidate.split()).casefold()
    normalized_context = " ".join(context.split()).casefold()
    if normalized_candidate and normalized_candidate in normalized_context:
        return candidate

    return context.strip()[:420]
