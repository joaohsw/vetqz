"""
PDF Service — extração de texto e chunking.

Responsável por:
1. Extrair texto de cada página do PDF usando pypdf.
2. Dividir o texto em chunks de tamanho fixo com overlap.
"""

import io

from pypdf import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """
    Extrai texto completo do PDF.

    Args:
        file_bytes: Bytes do arquivo PDF.

    Returns:
        Tupla (texto_completo, num_paginas).
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    num_pages = len(reader.pages)

    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text.strip())

    full_text = "\n\n".join(text_parts)
    return full_text, num_pages


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Divide texto em chunks de tamanho fixo com overlap.

    O overlap garante que contexto nas fronteiras dos chunks não seja perdido,
    melhorando a qualidade das perguntas geradas pela IA.

    Args:
        text: Texto completo extraído do PDF.
        chunk_size: Tamanho máximo de cada chunk em caracteres.
        overlap: Número de caracteres de sobreposição entre chunks.

    Returns:
        Lista de chunks de texto.
    """
    if not text or not text.strip():
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        # Avança com overlap
        start += chunk_size - overlap

    return chunks
