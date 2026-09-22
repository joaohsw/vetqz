"""Estimativa reproduzível e offline de texto de entrada; não é um tokenizer Gemini.

Execute de backend: python -m tests.benchmark_pdf_processing
"""

import json

from app.services.pdf_service import build_topic_chunks, chunk_pages, clean_pages


def sample_pages() -> list[str]:
    pages = ["Sumário\nOssos ........ 2\nMúsculos ........ 3\nNervos ........ 4\nVísceras ........ 5"]
    for page in range(1, 13):
        paragraphs = [
            " ".join(
                f"A estrutura {page}.{paragraph}.{sentence} apresenta relações anatômicas específicas, "
                "descritas em conjunto com sua função e localização no organismo."
                for sentence in range(4)
            ) for paragraph in range(4)
        ]
        pages.append("Anatomia Veterinária\n\n" + "\n\n".join(paragraphs)
                     + f"\n\nMaterial de estudo universitário\n{page}")
    pages.insert(5, "\n \n")
    pages.append(pages[2])  # Uma página acidentalmente duplicada na extração.
    return pages


def measure():
    pages = sample_pages()
    old_chunks = [page[start:start + 1000].strip() for page in pages
                  for start in range(0, len(page), 800) if page[start:start + 1000].strip()]
    new_chunks = chunk_pages(clean_pages(pages))
    topic_chunks = build_topic_chunks(new_chunks)
    old_chars = sum(len(chunk) for chunk in old_chunks)
    new_chars = sum(len(chunk["text"]) for chunk in topic_chunks)
    question_chars = sum(len(chunk["text"]) for chunk in new_chunks)
    return {
        "sample": "synthetic academic pages; no Gemini calls",
        "original_pages": len(pages),
        "old_input_chars": old_chars,
        "new_question_chars_with_overlap": question_chars,
        "new_topic_input_chars": new_chars,
        "old_input_tokens_estimate_chars_div_4": round(old_chars / 4),
        "new_input_tokens_estimate_chars_div_4": round(new_chars / 4),
        "single_analysis_text_reduction_percent": round(100 * (1 - new_chars / old_chars), 1),
        "two_languages_text_reduction_percent": round(100 * (1 - new_chars / (2 * old_chars)), 1),
        "cache_hit_gemini_tokens": 0,
    }


if __name__ == "__main__":
    print(json.dumps(measure(), indent=2))
