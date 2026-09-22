import asyncio
import copy
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import tests  # Configura credenciais fictícias antes de importar serviços.
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.routers import question_router, topic_router
from app.schemas.topic import AnalyzeTopicsRequest


MODEL_ANALYSIS = {
    "is_veterinary": False,
    "topics": [{"chunk_indices": [0, 1], "translations": {
        "pt-BR": {"title": "Sistema ósseo", "summary": "Estrutura e função dos ossos."},
        "es-CL": {"title": "Sistema óseo", "summary": "Estructura y función de los huesos."},
    }}],
}


class FakeSupabase:
    """Double em memória com filtros reais e lease atômico; nunca acessa rede."""

    def __init__(self):
        self.document = {"id": "document-1", "user_id": "owner",
                         "chunks": json.dumps(["O úmero articula-se com a escápula.", "A tíbia pertence ao membro pélvico."])}
        self.queries = []
        self.claims = 0
        self.auth = SimpleNamespace(get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id=token)))

    def table(self, name):
        assert name == "documents"
        return FakeQuery(self)

    def rpc(self, name, params):
        assert name == "claim_topic_analysis"
        def execute():
            self.claims += 1
            document = self.document
            claimed = bool(document and document["id"] == params["document_id"]
                           and document["user_id"] == params["owner_id"]
                           and not document.get("topic_analysis_lock_id"))
            if claimed:
                document["topic_analysis_lock_id"] = params["lock_id"]
            return SimpleNamespace(data=claimed)
        return SimpleNamespace(execute=execute)


class FakeQuery:
    def __init__(self, db):
        self.db = db
        self.filters = {}
        self.changes = None

    def select(self, _):
        return self

    def update(self, value):
        self.changes = value
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def execute(self):
        self.db.queries.append((copy.deepcopy(self.filters), copy.deepcopy(self.changes)))
        document = self.db.document
        if not document or any(document.get(key) != value for key, value in self.filters.items()):
            return SimpleNamespace(data=[])
        if self.changes is not None:
            document.update(copy.deepcopy(self.changes))
        return SimpleNamespace(data=[copy.deepcopy(document)])


class TopicEndpointTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeSupabase()
        self.model = AsyncMock(return_value=SimpleNamespace(text=json.dumps(MODEL_ANALYSIS)))
        for path, value in (
            ("app.routers.topic_router.get_supabase_client", lambda: self.db),
            ("app.routers.question_router.get_supabase_client", lambda: self.db),
            ("app.services.auth_service.get_supabase_client", lambda: self.db),
            ("app.services.gemini_service._client.aio.models.generate_content", self.model),
        ):
            patcher = patch(path, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        app = FastAPI()
        app.include_router(topic_router.router, prefix="/api")
        app.include_router(question_router.router, prefix="/api")
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def analyze(self, language="pt-BR", owner="owner"):
        return self.client.post("/api/analyze-topics", json={"document_id": "document-1", "language": language},
                                headers={"Authorization": f"Bearer {owner}"})

    def read_saved(self, language="pt-BR", owner="owner"):
        return self.client.get(f"/api/documents/document-1/topics?language={language}",
                               headers={"Authorization": f"Bearer {owner}"})

    def test_second_request_and_other_language_use_database_cache(self):
        first = self.analyze()
        self.assertEqual(first.status_code, 200, first.text)
        second = self.analyze()
        spanish = self.analyze("es-CL")
        self.assertEqual(first.json(), second.json())
        self.assertEqual(spanish.json()["topics"][0]["title"], "Sistema óseo")
        self.assertEqual(first.json()["topics"][0]["chunk_indices"], spanish.json()["topics"][0]["chunk_indices"])
        self.assertFalse(first.json()["is_veterinary"])
        self.assertNotIn("translations", spanish.json()["topics"][0])
        self.assertEqual(self.model.await_count, 1)
        self.assertEqual(self.db.claims, 1)
        for filters, _ in self.db.queries:
            self.assertEqual(filters["user_id"], "owner")
        cache = self.db.document["topic_analysis"]
        self.assertEqual(cache["topics"][0]["translations"]["es-CL"]["language"], "es-CL")

    def test_old_document_without_field_or_page_metadata(self):
        self.assertNotIn("topic_analysis", self.db.document)
        self.assertIsNone(self.read_saved().json())
        self.model.assert_not_awaited()
        self.assertEqual(self.analyze().status_code, 200)
        self.assertEqual(self.read_saved().json(), self.analyze().json())
        self.assertEqual(self.model.await_count, 1)

    def test_null_cache_is_supported(self):
        self.db.document["topic_analysis"] = None
        self.assertEqual(self.analyze("es-CL").status_code, 200)
        self.assertEqual(self.model.await_count, 1)

    def test_version_processing_or_content_change_invalidates_cache(self):
        self.assertEqual(self.analyze().status_code, 200)
        for field in ("version", "processing_version", "chunks_sha256"):
            with self.subTest(field=field):
                self.db.document["topic_analysis"][field] = "outdated"
                self.assertIsNone(self.read_saved().json())
                self.assertEqual(self.analyze().status_code, 200)
        self.db.document["chunks"] = ["Texto do documento foi alterado."]
        self.assertIsNone(self.read_saved().json())
        self.assertEqual(self.analyze().status_code, 200)
        self.assertEqual(self.model.await_count, 5)

    def test_invalid_cached_indices_are_not_reused(self):
        self.analyze()
        self.db.document["topic_analysis"]["topics"][0]["chunk_indices"] = [999]
        self.assertIsNone(self.read_saved().json())
        self.assertEqual(self.analyze().status_code, 200)
        self.assertEqual(self.model.await_count, 2)

    def test_missing_translation_sends_only_metadata_and_keeps_indices(self):
        self.analyze()
        del self.db.document["topic_analysis"]["topics"][0]["translations"]["es-CL"]
        self.assertIsNone(self.read_saved("es-CL").json())
        self.model.return_value = SimpleNamespace(text=json.dumps({"topics": [{"id": "topic-1", "title": "Sistema óseo",
                                                                               "summary": "Estructura ósea.", "chunk_indices": [999]}]}))
        spanish = self.analyze("es-CL")
        self.assertEqual(spanish.status_code, 200, spanish.text)
        self.assertEqual(spanish.json()["topics"][0]["chunk_indices"], [0, 1])
        prompt = self.model.call_args.kwargs["contents"]
        self.assertIn("Sistema ósseo", prompt)
        self.assertNotIn("O úmero articula-se", prompt)
        self.assertNotIn("A tíbia pertence", prompt)
        self.assertNotIn("chunk_indices", prompt)
        self.assertEqual(self.analyze("es-CL").json(), spanish.json())
        self.assertEqual(self.model.await_count, 2)

    def test_failed_translation_preserves_base_analysis_for_retry(self):
        partial = copy.deepcopy(MODEL_ANALYSIS)
        del partial["topics"][0]["translations"]["es-CL"]
        self.model.side_effect = [SimpleNamespace(text=json.dumps(partial)), RuntimeError("offline failure")]
        self.assertEqual(self.analyze("es-CL").status_code, 502)
        self.assertIsNotNone(self.db.document["topic_analysis"])
        self.assertIsNone(self.db.document["topic_analysis_lock_id"])
        self.assertEqual(self.analyze().status_code, 200)
        self.model.side_effect = None
        self.model.return_value = SimpleNamespace(text=json.dumps({"topics": [{"id": "topic-1", "title": "Sistema óseo", "summary": "Estructura ósea."}]}))
        self.assertEqual(self.analyze("es-CL").status_code, 200)
        self.assertNotIn("O úmero articula-se", self.model.call_args.kwargs["contents"])

    def test_invalid_model_response_does_not_poison_cache(self):
        self.model.return_value = SimpleNamespace(text='{"topics": [], "is_veterinary": false}')
        self.assertEqual(self.analyze().status_code, 502)
        self.assertIsNone(self.db.document.get("topic_analysis"))
        self.assertIsNone(self.db.document["topic_analysis_lock_id"])

    def test_authentication_and_owner_checks_on_both_routes(self):
        self.analyze()
        self.model.reset_mock()
        self.assertEqual(self.analyze(owner="other-user").status_code, 404)
        self.assertEqual(self.read_saved(owner="other-user").status_code, 404)
        self.assertEqual(self.client.post("/api/analyze-topics", json={"document_id": "document-1"}).status_code, 401)
        self.assertEqual(self.client.get("/api/documents/document-1/topics").status_code, 401)
        self.model.assert_not_awaited()

    def test_concurrent_requests_make_one_gemini_call(self):
        async def respond(**_):
            await asyncio.sleep(0.02)
            return SimpleNamespace(text=json.dumps(MODEL_ANALYSIS))
        self.model.side_effect = respond

        async def run():
            return await asyncio.gather(*[
                topic_router.analyze_topics_endpoint(AnalyzeTopicsRequest(document_id="document-1", language=language), "owner")
                for language in ("pt-BR", "pt-BR", "es-CL")
            ])
        results = asyncio.run(run())
        self.assertEqual(results[0].topics[0].title, "Sistema ósseo")
        self.assertEqual(results[2].topics[0].title, "Sistema óseo")
        self.assertEqual(self.model.await_count, 1)

    def test_question_still_sends_only_selected_chunk_and_validates_citation(self):
        self.db.document["chunks"] = [
            {"text": "O úmero articula-se com a escápula.", "page_number": 3},
            {"text": "A tíbia pertence ao membro pélvico.", "page_number": 7},
        ]
        self.model.return_value = SimpleNamespace(text=json.dumps({"question": "Qual é a posição da tíbia?",
                            "reference_answer": "No membro pélvico.", "source_excerpt": "Citação inventada."}))
        response = self.client.post("/api/generate-question", json={"document_id": "document-1", "chunk_index": 1},
                                    headers={"Authorization": "Bearer owner"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["source"], {"page_number": 7, "excerpt": "A tíbia pertence ao membro pélvico."})
        self.assertNotIn("O úmero articula-se", self.model.call_args.kwargs["contents"])
        self.assertIn("A tíbia pertence", self.model.call_args.kwargs["contents"])
        self.assertEqual(type(settings).model_fields["max_pdf_size_mb"].default, 25)

    def test_aliases_and_filtered_contents_indices_are_preserved(self):
        self.db.document["chunks"] = [
            "Sumário\nOssos .... 1\nMúsculos .... 2\nNervos .... 3\nVasos .... 4",
            "O úmero articula-se com a escápula.", "O úmero articula-se com a escápula.",
        ]
        model = copy.deepcopy(MODEL_ANALYSIS)
        model["topics"][0]["chunk_indices"] = [0, 1, 999, True]
        self.model.return_value = SimpleNamespace(text=json.dumps(model))
        response = self.analyze()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["topics"][0]["chunk_indices"], [1, 2])
        prompt = self.model.call_args.kwargs["contents"]
        self.assertIn("#1, #2", prompt)
        self.assertNotIn("Ossos ....", prompt)


if __name__ == "__main__":
    unittest.main()
