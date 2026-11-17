import copy
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import tests  # Configures fake credentials before importing services.
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import evaluation_router, question_router, study_session_router
from app.services import gemini_service
from app.services.auth_service import require_current_user


class InMemorySupabase:
    def __init__(self):
        self.rows = {
            "documents": [
                {
                    "id": "doc-1",
                    "user_id": "owner",
                    "filename": "anatomia.pdf",
                    "chunks": json.dumps([
                        {
                            "text": "O músculo supraespinhal origina-se na fossa supraespinhal da escápula e atua principalmente na extensão da articulação do ombro.",
                            "page_number": 4,
                        },
                        {
                            "text": "O fêmur é o osso mais longo do membro pélvico e articula-se proximalmente com o acetábulo.",
                            "page_number": 8,
                        },
                    ]),
                }
            ],
            "study_sessions": [],
            "quiz_sessions": [],
        }

    def table(self, name):
        return InMemoryQuery(self, name)


class InMemoryQuery:
    def __init__(self, db, name):
        self.db = db
        self.name = name
        self.filters = {}
        self.values = None
        self.inserted = None
        self.orders = []
        self.bounds = None
        self.max_rows = None

    def select(self, *_):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def in_(self, key, values):
        self.filters[key] = values
        return self

    def order(self, key, desc=False):
        self.orders.append((key, desc))
        return self

    def limit(self, count):
        self.max_rows = count
        return self

    def range(self, start, end):
        self.bounds = (start, end)
        return self

    def insert(self, values):
        self.inserted = values
        return self

    def update(self, values):
        self.values = values
        return self

    def execute(self):
        rows = self.db.rows[self.name]
        if self.inserted is not None:
            defaults = {"status": "active"} if self.name == "study_sessions" else {}
            row = {"id": f"{self.name}-{len(rows) + 1}", "started_at": "2026-11-16T20:00:00Z", **defaults, **self.inserted}
            rows.append(row)
            return SimpleNamespace(data=[copy.deepcopy(row)])

        found = [
            row for row in rows
            if all(
                row.get(key) in value if isinstance(value, list) else row.get(key) == value
                for key, value in self.filters.items()
            )
        ]
        if self.values is not None:
            for row in found:
                row.update(copy.deepcopy(self.values))
        for key, desc in reversed(self.orders):
            found.sort(key=lambda row: row.get(key) or "", reverse=desc)
        if self.bounds:
            start, end = self.bounds
            found = found[start:end + 1]
        if self.max_rows is not None:
            found = found[:self.max_rows]
        return SimpleNamespace(data=copy.deepcopy(found))


class MultipleChoiceTests(unittest.TestCase):
    def setUp(self):
        self.db = InMemorySupabase()
        app = FastAPI()
        for router in (question_router.router, evaluation_router.router, study_session_router.router):
            app.include_router(router, prefix="/api")
        app.dependency_overrides[require_current_user] = lambda: "owner"
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

        for module in (question_router, evaluation_router, study_session_router):
            patcher = patch.object(module, "get_supabase_client", return_value=self.db)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_generate_multiple_choice_question_shuffles_and_strips_prefixes(self):
        payload = {
            "question": "Qual é a principal ação do músculo supraespinhal?",
            "correct_option": "A) Extensão da articulação do ombro",
            "distractors": [
                {"text": "B) Flexão da articulação do tarso", "why_wrong": "O tarso fica no membro pélvico."},
                {"text": "3. Rotação lateral do carpo", "why_wrong": "O supraespinhal não atua no carpo."},
                {"text": "D) Abdução da articulação coxofemoral", "why_wrong": "A articulação coxofemoral pertence ao membro pélvico."},
            ],
            "explanation": "O músculo supraespinhal atua principalmente na extensão da articulação do ombro.",
            "source_excerpt": "O músculo supraespinhal origina-se na fossa supraespinhal da escápula e atua principalmente na extensão da articulação do ombro.",
        }
        model = AsyncMock(return_value=SimpleNamespace(text=json.dumps(payload)))

        def reverse_shuffle(items):
            items.reverse()

        with patch.object(gemini_service._client.aio.models, "generate_content", model), \
             patch("app.services.gemini_service.random.shuffle", side_effect=reverse_shuffle):
            for language in ("pt-BR", "es-CL"):
                for difficulty in ("easy", "medium", "hard"):
                    with self.subTest(language=language, difficulty=difficulty):
                        response = self.client.post(
                            "/api/generate-question",
                            json={
                                "document_id": "doc-1",
                                "chunk_index": 0,
                                "language": language,
                                "difficulty": difficulty,
                                "question_type": "multiple_choice",
                            },
                        )
                        self.assertEqual(response.status_code, 200, response.text)
                        body = response.json()
                        self.assertEqual(body["question_type"], "multiple_choice")
                        self.assertEqual([opt["id"] for opt in body["options"]], ["A", "B", "C", "D"])
                        self.assertEqual(body["correct_option_id"], "D")
                        self.assertEqual(body["options"][3]["text"], "Extensão da articulação do ombro")
                        self.assertEqual(body["options"][2]["text"], "Flexão da articulação do tarso")
                        self.assertEqual(body["options"][1]["text"], "Rotação lateral do carpo")
                        self.assertEqual(body["options"][0]["text"], "Abdução da articulação coxofemoral")
                        self.assertEqual(body["reference_answer"], payload["explanation"])
                        self.assertEqual(body["source"]["page_number"], 4)
                        instruction = model.call_args.kwargs["config"].system_instruction
                        self.assertIn("múltipla escolha", instruction)

    def test_generate_multiple_choice_rejects_insufficient_or_duplicate_distractors(self):
        bad_payload = {
            "question": "Pergunta?",
            "correct_option": "Resposta correta",
            "distractors": [
                {"text": "Resposta correta", "why_wrong": "Duplicada"},
                {"text": "Distrator único", "why_wrong": "Só um válido"},
            ],
            "explanation": "Explicação.",
            "source_excerpt": "O fêmur é o osso mais longo",
        }
        model = AsyncMock(return_value=SimpleNamespace(text=json.dumps(bad_payload)))
        with patch.object(gemini_service._client.aio.models, "generate_content", model):
            response = self.client.post(
                "/api/generate-question",
                json={
                    "document_id": "doc-1",
                    "chunk_index": 1,
                    "language": "es-CL",
                    "question_type": "multiple_choice",
                },
            )
            self.assertEqual(response.status_code, 502)
            self.assertIn("4 alternativas válidas", response.json()["detail"])

    def test_evaluate_multiple_choice_grades_deterministically_without_gemini(self):
        options = [
            {"id": "A", "text": "Úmero", "rationale": "O úmero pertence ao membro torácico."},
            {"id": "B", "text": "Fêmur", "rationale": None},
            {"id": "C", "text": "Rádio", "rationale": "O rádio fica no antebraço."},
            {"id": "D", "text": "Escápula", "rationale": "A escápula articula-se com o úmero."},
        ]
        gemini_eval = AsyncMock()
        with patch.object(evaluation_router, "evaluate_answer", gemini_eval):
            wrong = self.client.post(
                "/api/evaluate-answer",
                data={
                    "question": "Qual osso articula-se proximalmente com o acetábulo?",
                    "reference_answer": "O fêmur articula-se proximalmente com o acetábulo.",
                    "student_answer": "A",
                    "question_type": "multiple_choice",
                    "options": json.dumps(options),
                    "correct_option_id": "B",
                    "selected_option_id": "A",
                    "document_id": "doc-1",
                    "chunk_index": 1,
                    "source_excerpt": "O fêmur é o osso mais longo do membro pélvico",
                    "language": "pt-BR",
                },
            )
            self.assertEqual(wrong.status_code, 200, wrong.text)
            wrong_body = wrong.json()
            self.assertEqual(wrong_body["score"], 0.0)
            self.assertEqual(wrong_body["question_type"], "multiple_choice")
            self.assertEqual(wrong_body["selected_option_id"], "A")
            self.assertEqual(wrong_body["correct_option_id"], "B")
            self.assertIn("O úmero pertence ao membro torácico.", wrong_body["feedback"])
            self.assertTrue(wrong_body["model_answer"].startswith("B) Fêmur"))
            self.assertEqual(wrong_body["source"]["page_number"], 8)

            right = self.client.post(
                "/api/evaluate-answer",
                data={
                    "question": "¿Qué hueso se articula proximalmente con el acetábulo?",
                    "reference_answer": "El fémur se articula con el acetábulo.",
                    "student_answer": "B",
                    "question_type": "multiple_choice",
                    "options": json.dumps(options),
                    "correct_option_id": "B",
                    "selected_option_id": "B",
                    "language": "es-CL",
                },
            )
            self.assertEqual(right.status_code, 200, right.text)
            right_body = right.json()
            self.assertEqual(right_body["score"], 10.0)
            self.assertIn("¡Respuesta correcta!", right_body["feedback"])
            gemini_eval.assert_not_awaited()

    def test_evaluate_multiple_choice_rejects_invalid_payloads(self):
        options = json.dumps([{"id": "A", "text": "Um"}, {"id": "B", "text": "Dois"}])
        bad_options = self.client.post(
            "/api/evaluate-answer",
            data={
                "question": "Q?",
                "reference_answer": "Exp",
                "student_answer": "A",
                "question_type": "multiple_choice",
                "options": "not-json",
                "correct_option_id": "A",
                "selected_option_id": "A",
                "language": "pt-BR",
            },
        )
        self.assertEqual(bad_options.status_code, 422)

        bad_selection = self.client.post(
            "/api/evaluate-answer",
            data={
                "question": "Q?",
                "reference_answer": "Exp",
                "student_answer": "Z",
                "question_type": "multiple_choice",
                "options": options,
                "correct_option_id": "A",
                "selected_option_id": "Z",
                "language": "es-CL",
            },
        )
        self.assertEqual(bad_selection.status_code, 422)
        self.assertEqual(bad_selection.json()["detail"], "Selecciona una alternativa válida para enviar tu respuesta.")

    def test_mixed_session_persists_question_mode_retry_and_history_defaults(self):
        create_res = self.client.post(
            "/api/study-sessions",
            json={
                "document_id": "doc-1",
                "topic_titles": ["Membro pélvico"],
                "planned_question_count": 2,
                "difficulty": "medium",
                "question_mode": "mixed",
                "feedback_mode": "immediate",
                "language": "pt-BR",
            },
        )
        self.assertEqual(create_res.status_code, 201, create_res.text)
        session_id = create_res.json()["id"]

        options = [
            {"id": "A", "text": "Tíbia", "rationale": "Fica distal ao fêmur."},
            {"id": "B", "text": "Fêmur", "rationale": None},
        ]
        first_mc = self.client.post(
            "/api/evaluate-answer",
            data={
                "question": "Qual osso forma a coxa?",
                "reference_answer": "O fêmur.",
                "student_answer": "A",
                "question_type": "multiple_choice",
                "options": json.dumps(options),
                "correct_option_id": "B",
                "selected_option_id": "A",
                "study_session_id": session_id,
                "question_position": 1,
            },
        )
        self.assertEqual(first_mc.status_code, 200)
        attempt_id = first_mc.json()["attempt_id"]

        retry_mc = self.client.post(
            "/api/evaluate-answer",
            data={
                "question": "Qual osso forma a coxa?",
                "reference_answer": "O fêmur.",
                "student_answer": "B",
                "question_type": "multiple_choice",
                "options": json.dumps(options),
                "correct_option_id": "B",
                "selected_option_id": "B",
                "study_session_id": session_id,
                "question_position": 1,
                "retry_attempt_id": attempt_id,
            },
        )
        self.assertEqual(retry_mc.status_code, 200)
        self.assertEqual(retry_mc.json()["score"], 10.0)

        gemini_eval = AsyncMock(return_value={"score": 7.0, "feedback": "Boa resposta.", "model_answer": "Modelo"})
        with patch.object(evaluation_router, "evaluate_answer", gemini_eval):
            desc = self.client.post(
                "/api/evaluate-answer",
                data={
                    "question": "Explique o supraespinhal.",
                    "reference_answer": "Estende o ombro.",
                    "student_answer": "Estende a articulação.",
                    "question_type": "descriptive",
                    "study_session_id": session_id,
                    "question_position": 2,
                },
            )
            self.assertEqual(desc.status_code, 200)

        # Legacy session row lacking question_mode/question_type fields must still deserialize safely.
        self.db.rows["study_sessions"].append({
            "id": "legacy-session",
            "user_id": "owner",
            "document_id": "doc-1",
            "document_filename": "antigo.pdf",
            "topic_titles": ["Geral"],
            "planned_question_count": 1,
            "difficulty": "medium",
            "feedback_mode": "immediate",
            "status": "completed",
            "started_at": "2026-01-01T10:00:00Z",
        })
        self.db.rows["quiz_sessions"].append({
            "id": "legacy-attempt",
            "user_id": "owner",
            "study_session_id": "legacy-session",
            "question": "Pergunta antiga?",
            "reference_answer": "Resposta antiga.",
            "question_position": 1,
            "score": 8.0,
        })

        sessions = self.client.get("/api/study-sessions").json()
        mixed_session = next(s for s in sessions if s["id"] == session_id)
        legacy_session = next(s for s in sessions if s["id"] == "legacy-session")

        self.assertEqual(mixed_session["question_mode"], "mixed")
        self.assertEqual(mixed_session["answered_question_count"], 2)
        self.assertEqual(mixed_session["average_score"], 8.5)
        self.assertEqual(mixed_session["attempts"][0]["question_type"], "multiple_choice")
        self.assertEqual(mixed_session["attempts"][0]["selected_option_id"], "B")
        self.assertEqual(mixed_session["attempts"][0]["correct_option_id"], "B")
        self.assertEqual(len(mixed_session["attempts"][0]["options"]), 2)
        self.assertEqual(mixed_session["attempts"][1]["question_type"], "descriptive")
        self.assertEqual(mixed_session["attempts"][1]["options"], [])

        self.assertEqual(legacy_session["question_mode"], "descriptive")
        self.assertEqual(legacy_session["attempts"][0]["question_type"], "descriptive")


if __name__ == "__main__":
    unittest.main()
