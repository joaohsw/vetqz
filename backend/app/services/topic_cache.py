"""Formato persistido e validação do mapa bilíngue, sem depender do frontend."""

import hashlib
import json

from app.schemas.language import LANGUAGE_NAMES
from app.services.pdf_service import PDF_PROCESSING_VERSION

TOPIC_ANALYSIS_VERSION = 1


def chunks_fingerprint(chunks: list[dict]) -> str:
    payload = json.dumps(chunks, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def make_topic_cache(analysis: dict, chunks: list[dict]) -> dict:
    return {
        "version": TOPIC_ANALYSIS_VERSION,
        "processing_version": PDF_PROCESSING_VERSION,
        "chunks_sha256": chunks_fingerprint(chunks),
        "is_veterinary": analysis["is_veterinary"],
        "topics": analysis["topics"],
    }


def valid_topic_cache(raw: object, chunks: list[dict]) -> dict | None:
    """Cache antigo/ausente, versão divergente ou índices inválidos são misses."""
    if not isinstance(raw, dict):
        return None
    if (raw.get("version") != TOPIC_ANALYSIS_VERSION
            or raw.get("processing_version") != PDF_PROCESSING_VERSION
            or raw.get("chunks_sha256") != chunks_fingerprint(chunks)
            or type(raw.get("is_veterinary")) is not bool):
        return None
    topics = raw.get("topics")
    if not isinstance(topics, list) or not topics:
        return None
    ids = set()
    for topic in topics:
        if not isinstance(topic, dict) or not isinstance(topic.get("id"), str) or not topic["id"] or topic["id"] in ids:
            return None
        ids.add(topic["id"])
        indices = topic.get("chunk_indices")
        if (not isinstance(indices, list) or not indices
                or any(type(index) is not int or not 0 <= index < len(chunks) for index in indices)):
            return None
        translations = topic.get("translations")
        if not isinstance(translations, dict) or not any(
            valid_translation(translations.get(language), language) for language in LANGUAGE_NAMES
        ):
            return None
    return raw


def valid_translation(value: object, language: str) -> bool:
    return (isinstance(value, dict) and value.get("language") == language
            and isinstance(value.get("title"), str) and bool(value["title"].strip())
            and isinstance(value.get("summary"), str) and bool(value["summary"].strip()))


def localized_analysis(cache: dict | None, language: str) -> dict | None:
    if not cache:
        return None
    topics = []
    for topic in cache["topics"]:
        translation = topic["translations"].get(language)
        if not valid_translation(translation, language):
            return None
        topics.append({"id": topic["id"], "chunk_indices": topic["chunk_indices"],
                       "title": translation["title"], "summary": translation["summary"]})
    return {"topics": topics, "is_veterinary": cache["is_veterinary"]}
