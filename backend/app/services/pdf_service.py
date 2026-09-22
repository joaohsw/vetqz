"""Extração de PDF com trechos rastreáveis até a página de origem."""

import io
import math
import re
import unicodedata
from bisect import bisect_left, bisect_right
from collections import Counter
from collections.abc import Iterable

from pypdf import PdfReader

PDF_PROCESSING_VERSION = 2

_TOC_HEADING = re.compile(r"^(?:sum[aá]rio|[íi]ndice(?:\s+(?:geral|remissivo|alfab[eé]tico))?|tabla de contenidos|table of contents|contents)\s*[:.]?$", re.I)
_TOC_ENTRY = re.compile(r"(?:\.{2,}|…|\s{2,})\s*(?:\d{1,4}|[ivxlcdm]+)\s*$", re.I)
_PAGE_NUMBER = re.compile(r"^(?:(?:p[aá]g(?:ina)?\.?|page)\s*)?[-–—]?\s*(?:\d{1,4}|[ivxlcdm]{1,8})(?:\s*(?:/|de|of)\s*\d{1,4})?\s*[-–—]?$", re.I)
_ABBREVIATION = re.compile(r"(?:\b(?:Dr|Dra|Prof|Profa|Fig|Figs|Tab|vol|cap|p|pp|art|etc|vs|aprox|m|mm|cm|n|nn|a|aa|v|vv)|\bet\s+al)\.$", re.I)


def is_likely_table_of_contents(text: str) -> bool:
    """Exige estrutura de índice; a palavra 'índice' em prosa não basta."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return False
    heading = bool(_TOC_HEADING.fullmatch(lines[0]))
    entries = lines[1:] if heading else lines
    if heading and not entries:
        return True
    numbered = sum(bool(re.search(r"\s(?:\d{1,4}|[ivxlcdm]+)$", line, re.I)) and len(line) < 150 for line in entries)
    leaders = sum(bool(_TOC_ENTRY.search(line)) for line in entries)
    # Sumários podem compartilhar a página com o início de um capítulo.
    # Uma frase de prosa deve impedir a remoção da página inteira.
    if any(len(line) >= 150 or re.search(r"[.!?;]$", line) for line in entries):
        return False
    return bool(entries) and (
        (heading and numbered >= 3 and numbered / len(entries) >= 0.7)
        or (leaders >= 4 and leaders / len(entries) >= 0.8)
    )


def _normalize_page_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).replace("\r\n", "\n").replace("\r", "\n")
    # Soft hyphen é uma marca editorial explícita, inclusive dentro da linha.
    text = re.sub(r"\u00ad[ \t]*\n[ \t]*", "", text).replace("\u00ad", "")
    # Conservar compostos anatômicos: só unir hífen ASCII quando a palavra
    # inteira também aparece no material (tratado em clean_pages).
    text = re.sub(r"[^\S\n]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(line.strip() for line in text.splitlines())).strip()


def clean_pages(page_texts: Iterable[str]) -> list[str]:
    """Limpeza conservadora, determinística e sem renumerar páginas vazias."""
    pages = [_normalize_page_text(text) for text in page_texts]
    words = set(re.findall(r"[^\W\d_]+", "\n".join(pages).casefold()))

    def join_hyphen(match: re.Match) -> str:
        left, right = match.groups()
        # Sem evidência, retirar apenas a quebra e preservar o hífen lexical.
        return left + ("" if (left + right).casefold() in words else "-") + right

    pages = [re.sub(r"([^\W\d_]{2,})-\n([a-zà-öø-ÿ][^\W\d_]*)", join_hyphen, page) for page in pages]
    lines_by_page = [page.splitlines() for page in pages]
    nonempty_count = sum(bool(lines) for lines in lines_by_page)
    margin_counts: Counter = Counter()
    for lines in lines_by_page:
        content = [line for line in lines if line]
        # Uma frase completa ou uma linha longa pode ser conteúdo acadêmico.
        margin_counts.update({line for line in content[:2] + content[-2:]
                              if len(line) <= 120 and not re.search(r"[.!?;:]$", line)})
    repeated = {line for line, count in margin_counts.items()
                if count >= max(3, math.ceil(nonempty_count * 0.6))}
    seen_pages: set[str] = set()
    seen_paragraphs: set[str] = set()
    cleaned = []
    for lines in lines_by_page:
        nonempty = [index for index, line in enumerate(lines) if line]
        margins = set(nonempty[:2] + nonempty[-2:])
        edges = set(nonempty[:1] + nonempty[-1:])
        text = "\n".join(line for index, line in enumerate(lines)
                         if not ((index in margins and line in repeated)
                                 or (index in edges and _PAGE_NUMBER.fullmatch(line))))
        if is_likely_table_of_contents(text):
            cleaned.append("")
            continue
        paragraphs = []
        for paragraph in re.split(r"\n\s*\n", text):
            # Quebras simples podem ser listas/tabelas: mantê-las para não
            # fundir estruturas distintas. Normalizar somente espaços.
            paragraph = paragraph.strip()
            key = " ".join(paragraph.split())
            if len(key) >= 160 and key in seen_paragraphs:
                continue
            if key:
                paragraphs.append(paragraph)
            if len(key) >= 160:
                seen_paragraphs.add(key)
        text = "\n\n".join(paragraphs)
        key = " ".join(text.split())
        if len(key) >= 100 and key in seen_pages:
            text = ""
        if len(key) >= 100:
            seen_pages.add(key)
        cleaned.append(text)
    return cleaned


def extract_text_by_page(file_bytes: bytes) -> tuple[list[str], int]:
    """Extrai o texto de cada página, preservando a ordem do documento."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        page_text = page.extract_text()
        pages.append(page_text.strip() if page_text else "")
    return clean_pages(pages), len(reader.pages)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Prefere parágrafos/frases; overlap de frases completas no mesmo parágrafo."""
    return [text[start:end] for start, end in _chunk_spans(text, chunk_size, overlap)]


def _sentence_ends(text: str) -> list[int]:
    return [match.end() for match in re.finditer(r'[.!?]["”’)]*(?=\s|$)', text)
            if not _ABBREVIATION.search(text[max(0, match.end() - 16):match.end()])]


def _chunk_spans(text: str, chunk_size: int, overlap: int) -> list[tuple[int, int]]:
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_size deve ser positivo e 0 <= overlap < chunk_size")
    paragraphs = [match.start() for match in re.finditer(r"\n\s*\n", text)]
    sentences = _sentence_ends(text)
    words = [match.start() for match in re.finditer(r"\s+", text)]
    spans = []
    start = 0
    previous_end = 0
    while start < len(text):
        while start < len(text) and text[start].isspace():
            start += 1
        if start >= len(text):
            break
        target = start + chunk_size
        if target >= len(text):
            end = len(text)
        else:
            lower = max(previous_end + 1, start + int(chunk_size * 0.7))
            upper = start + int(chunk_size * 1.2)
            end = 0
            for boundaries in (paragraphs, sentences, words):
                candidates = boundaries[bisect_left(boundaries, lower):bisect_right(boundaries, upper)]
                if candidates:
                    end = min(candidates, key=lambda point: (abs(point - target), point))
                    break
            if not end:
                # Uma palavra excepcionalmente longa fica inteira.
                word_position = bisect_right(words, target)
                end = words[word_position] if word_position < len(words) else len(text)
        while end > start and text[end - 1].isspace():
            end -= 1
        spans.append((start, end))
        if end == len(text):
            break
        next_start = end
        # Sem overlap entre parágrafos ou para frases maiores que o orçamento.
        if overlap and not re.match(r"\s*\n\s*\n", text[end:]):
            paragraph_position = bisect_left(paragraphs, end) - 1
            paragraph_start = paragraphs[paragraph_position] + 2 if paragraph_position >= 0 else start
            lower = max(start + 1, end - overlap, paragraph_start)
            starts = sentences[bisect_left(sentences, lower):bisect_left(sentences, end)]
            if starts:
                next_start = min(starts)
        previous_end, start = end, next_start
    return spans


def chunk_pages(page_texts: Iterable[str]) -> list[dict[str, int | str]]:
    """Cria trechos indexáveis, cada um ligado à página da qual foi extraído."""
    chunks: list[dict[str, int | str]] = []
    for page_number, text in enumerate(page_texts, start=1):
        for start, end in _chunk_spans(text, 1000, 200):
            chunks.append({"text": text[start:end], "page_number": page_number,
                           "start_char": start, "end_char": end})
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
        chunk = {
            "text": text,
            "page_number": page_number if isinstance(page_number, int) and page_number > 0 else None,
        }
        start, end = raw_chunk.get("start_char"), raw_chunk.get("end_char")
        if type(start) is int and type(end) is int and start >= 0 and end - start == len(text):
            chunk.update(start_char=start, end_char=end)
        normalized.append(chunk)

    return normalized


def build_topic_chunks(chunks: list[dict]) -> list[dict]:
    """Remove apenas overlap comprovado; nunca renumera os chunks de perguntas."""
    result: list[dict] = []
    seen: dict[str, dict] = {}
    previous = None
    previous_item = None
    for index, chunk in enumerate(chunks):
        text = chunk["text"]
        if is_likely_table_of_contents(text):
            # Conteúdo omitido não pode justificar retirar texto do próximo.
            previous, previous_item = None, None
            continue
        unique_text = text
        if previous and previous["page_number"] == chunk["page_number"]:
            previous_text = previous["text"]
            # Offsets de novos PDFs; comparação exata para documentos legados.
            if "start_char" in chunk and "end_char" in previous:
                size = max(0, previous["end_char"] - chunk["start_char"])
                if size <= len(text) and previous_text.endswith(text[:size]):
                    unique_text = text[size:]
            else:
                for size in range(min(200, len(previous_text), len(text)), 19, -1):
                    if previous_text.endswith(text[:size]):
                        unique_text = text[size:]
                        break
        previous = chunk
        key = " ".join(text.split())
        if key in seen:
            seen[key]["chunk_indices"].append(index)
            previous_item = seen[key]
            continue
        if not unique_text.strip():
            # Um chunk inteiramente coberto ainda aponta para o texto enviado.
            if previous_item is not None:
                previous_item["chunk_indices"].append(index)
            continue
        item = {"text": unique_text.strip(), "chunk_indices": [index], "page_number": chunk["page_number"]}
        seen[key] = item
        result.append(item)
        previous_item = item
    return result


def validate_source_excerpt(excerpt: object, context: str) -> str:
    """Aceita apenas uma citação curta que exista no trecho usado pela pergunta."""
    candidate = str(excerpt or "").strip()[:420]
    normalized_candidate = " ".join(candidate.split()).casefold()
    normalized_context = " ".join(context.split()).casefold()
    if normalized_candidate and normalized_candidate in normalized_context:
        return candidate

    return context.strip()[:420]
