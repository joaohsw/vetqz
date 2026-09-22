import io
import unittest

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.services.pdf_service import (
    build_topic_chunks, chunk_pages, chunk_text, clean_pages,
    extract_text_by_page, is_likely_table_of_contents, normalize_document_chunks, validate_source_excerpt,
)


class CleaningTests(unittest.TestCase):
    def test_real_pdf_extraction_preserves_original_page_count(self):
        writer = PdfWriter()
        writer.add_blank_page(width=600, height=800)
        page = writer.add_blank_page(width=600, height=800)
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): DictionaryObject({
                NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            })}),
        })
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 50 700 Td (Musculus biceps brachii.) Tj ET")
        page[NameObject("/Contents")] = stream
        output = io.BytesIO()
        writer.write(output)
        pages, count = extract_text_by_page(output.getvalue())
        self.assertEqual(count, 2)
        self.assertEqual(pages, ["", "Musculus biceps brachii."])
        self.assertEqual(chunk_pages(pages)[0]["page_number"], 2)

    def test_repeated_margins_and_empty_pages_keep_page_numbers(self):
        pages = [f"Anatomia Veterinária\n\nO órgão {i} possui uma descrição acadêmica única.\n\nUniversidade de estudo\n{i}"
                 for i in range(1, 5)]
        pages.insert(1, " \n\t ")
        cleaned = clean_pages(pages)
        self.assertEqual(len(cleaned), 5)
        self.assertEqual(cleaned[1], "")
        self.assertTrue(all("Universidade" not in page and "Anatomia Veterinária" not in page for page in cleaned))
        self.assertEqual([chunk["page_number"] for chunk in chunk_pages(cleaned)], [1, 3, 4, 5])

    def test_whitespace_hyphenation_and_latin_names(self):
        text = "A  anatomia\n\n\n\nA ana-\ntomia e o músculo esterno-\ncefálico.\nO ligamento supra\u00adespinhal e Musculus biceps brachii."
        cleaned = clean_pages([text])[0]
        self.assertNotIn("  ", cleaned)
        self.assertNotIn("\n\n\n", cleaned)
        self.assertIn("A anatomia e", cleaned)
        self.assertIn("esterno-cefálico", cleaned)
        self.assertIn("supraespinhal", cleaned)
        self.assertIn("Musculus biceps brachii", cleaned)

    def test_page_labels_only_at_margins(self):
        text = "Página 2 de 10\nValores do experimento:\n42\nO índice cardíaco foi medido.\n— 2 —"
        cleaned = clean_pages([text])[0]
        self.assertNotIn("Página 2", cleaned)
        self.assertNotIn("— 2 —", cleaned)
        self.assertIn("\n42\n", cleaned)

    def test_contents_requires_structural_evidence(self):
        toc = "Sumário\nSistema ósseo ........ 3\nSistema muscular ........ 5\nSistema nervoso ........ 8\nSistema visceral ........ 10"
        self.assertTrue(is_likely_table_of_contents(toc))
        self.assertEqual(clean_pages([toc, "O coração apresenta quatro câmaras."])[0], "")
        for text in ("O índice cardíaco é uma medida hemodinâmica.",
                     "Índice\nO índice de massa corporal foi avaliado em cães.",
                     "Índice cefálico\nRelação entre largura e comprimento do crânio."):
            self.assertFalse(is_likely_table_of_contents(text))
            self.assertTrue(clean_pages([text])[0])

    def test_contents_sharing_a_page_with_academic_prose_is_not_discarded(self):
        text = "Sumário\nOssos .... 2\nMúsculos .... 3\nVasos .... 5\nNervos .... 7\nO úmero articula-se com a escápula."
        self.assertFalse(is_likely_table_of_contents(text))
        self.assertIn("O úmero articula-se", clean_pages([text])[0])

    def test_exact_duplicate_passages_and_pages(self):
        paragraph = "O fígado participa do metabolismo e apresenta organização lobular característica. " * 3
        cleaned = clean_pages([paragraph + "\n\nPrimeira observação.", paragraph + "\n\nSegunda observação."])
        self.assertIn(paragraph.strip(), cleaned[0])
        self.assertNotIn("organização", cleaned[1])
        self.assertIn("Segunda observação.", cleaned[1])
        self.assertEqual(clean_pages([paragraph, paragraph])[1], "")

    def test_short_definitions_and_numeric_content_are_preserved(self):
        text = "Musculus biceps brachii\n\nFunção: flexão do cotovelo.\n\nMusculus biceps brachii"
        self.assertEqual(clean_pages([text])[0].count("Musculus biceps brachii"), 2)
        self.assertEqual(clean_pages(["Hematócrito\n42\nValores percentuais."])[0], "Hematócrito\n42\nValores percentuais.")


class ChunkingTests(unittest.TestCase):
    def test_sentence_boundaries_and_small_overlap(self):
        sentences = [f"A estrutura número {i} tem relações anatômicas específicas e função definida." for i in range(80)]
        text = " ".join(sentences)
        chunks = chunk_pages([text])
        self.assertGreater(len(chunks), 2)
        for chunk in chunks:
            self.assertTrue(chunk["text"].startswith("A estrutura"))
            self.assertTrue(chunk["text"].endswith("definida."))
            self.assertEqual(text[chunk["start_char"]:chunk["end_char"]], chunk["text"])
            self.assertEqual(chunk["page_number"], 1)
        for previous, current in zip(chunks, chunks[1:]):
            self.assertLessEqual(previous["end_char"] - current["start_char"], 200)
            self.assertGreater(current["end_char"], previous["end_char"])

    def test_paragraph_boundary_does_not_need_overlap(self):
        paragraph = "Relação anatômica. " * 53
        chunks = chunk_pages([paragraph.strip() + "\n\n" + paragraph.replace("Relação", "Funções").strip()])
        self.assertEqual(len(chunks), 2)
        self.assertGreater(chunks[1]["start_char"], chunks[0]["end_char"])

    def test_long_sentence_and_word_never_split_words(self):
        words = [f"termoanatômico{i}" for i in range(200)]
        text = " ".join(words)
        chunks = chunk_text(text, 200, 0)
        self.assertEqual(" ".join(chunks), text)
        self.assertEqual(chunk_text("x" * 2500, 1000, 200), ["x" * 2500])

    def test_abbreviations_do_not_create_false_sentence_cuts(self):
        text = " ".join([f"O Dr. Silva identifica o m. biceps brachii na Fig. {i} e explica sua função." for i in range(50)])
        for chunk in chunk_text(text):
            self.assertTrue(chunk.startswith("O Dr."))
            self.assertTrue(chunk.endswith("função."))

    def test_invalid_sizes_and_no_trailing_overlap_only_chunk(self):
        for size, overlap in ((0, 0), (100, 100), (100, -1)):
            with self.assertRaises(ValueError):
                chunk_text("abc", size, overlap)
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_text("x" * 950), ["x" * 950])

    def test_topic_text_removes_overlap_and_preserves_indices(self):
        text = " ".join(f"A estrutura {i} possui características anatômicas descritas neste material." for i in range(90))
        chunks = normalize_document_chunks(chunk_pages(["", text]))
        topic_chunks = build_topic_chunks(chunks)
        self.assertEqual(" ".join(item["text"] for item in topic_chunks), text)
        self.assertEqual([index for item in topic_chunks for index in item["chunk_indices"]], list(range(len(chunks))))
        self.assertTrue(all(item["page_number"] == 2 for item in topic_chunks))
        self.assertLess(sum(len(item["text"]) for item in topic_chunks), sum(len(item["text"]) for item in chunks))

    def test_legacy_exact_overlap_and_gaps_keep_original_indices(self):
        overlap = "O conteúdo sobre os vasos linfáticos está presente neste trecho. " * 3
        first, second = "Sistema linfático. " + overlap, overlap + "Drenagem dos membros."
        toc = "Índice\nVasos ....... 1\nNervos ....... 2\nÓrgãos ....... 3\nMúsculos ....... 4"
        chunks = normalize_document_chunks([toc, first.strip(), second.strip(), "Estudo independente."])
        result = build_topic_chunks(chunks)
        self.assertEqual([item["chunk_indices"] for item in result], [[1], [2], [3]])
        self.assertEqual(result[1]["text"], "Drenagem dos membros.")
        self.assertTrue(all(chunk["page_number"] is None for chunk in chunks))

    def test_duplicates_keep_aliases_and_page_boundaries_do_not_trim(self):
        phrase = "Conteúdo acadêmico original e detalhado. " * 5
        chunks = normalize_document_chunks([
            {"text": phrase, "page_number": 1},
            {"text": phrase, "page_number": 2},
            {"text": phrase.strip() + " Outro conteúdo.", "page_number": 3},
        ])
        result = build_topic_chunks(chunks)
        self.assertEqual(result[0]["chunk_indices"], [0, 1])
        self.assertEqual(result[1]["text"], chunks[2]["text"])

    def test_fully_overlapped_legacy_tail_uses_the_correct_duplicate_alias(self):
        tail = "A descrição acadêmica da articulação encerra este trecho."
        first = "Anatomia da articulação. " * 12 + tail
        chunks = normalize_document_chunks([first, "Outro assunto independente.", first, tail])
        result = build_topic_chunks(chunks)
        self.assertEqual(result[0]["chunk_indices"], [0, 2, 3])
        self.assertEqual(result[1]["chunk_indices"], [1])

    def test_citation_is_still_validated_against_selected_chunk(self):
        context = "O úmero articula-se com a escápula. A articulação é sinovial."
        self.assertEqual(validate_source_excerpt("O úmero articula-se com a escápula.", context), "O úmero articula-se com a escápula.")
        self.assertEqual(validate_source_excerpt("Citação inventada.", context), context)


if __name__ == "__main__":
    unittest.main()
