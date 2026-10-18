import copy
import io
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import tests  # Forces fake credentials before importing services.
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.routers import evaluation_router, pdf_router, study_session_router
from app.services.auth_service import require_current_user


class Database:
    def __init__(self):
        self.rows = {
            'study_sessions': [{'id': 'session', 'user_id': 'owner', 'document_filename': 'atlas.pdf',
                'planned_question_count': 3, 'started_at': '2026-10-13T12:00:00Z', 'status': 'active'}],
            'quiz_sessions': [], 'documents': [], 'upload_intents': [],
        }
        self.fail = False

    def table(self, name):
        return Query(self, name)


class Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.filters, self.values, self.inserted = {}, None, None

    def select(self, *_): return self
    def eq(self, key, value): self.filters[key] = value; return self
    def in_(self, key, values): self.filters[key] = values; return self
    def order(self, *_, **__): return self
    def limit(self, *_): return self
    def insert(self, values): self.inserted = values; return self
    def update(self, values): self.values = values; return self

    def execute(self):
        if self.db.fail: raise RuntimeError('Database unavailable')
        rows = self.db.rows[self.name]
        if self.inserted is not None:
            row = {'id': f'{self.name}-{len(rows)+1}', **self.inserted}
            rows.append(row)
            return SimpleNamespace(data=[copy.deepcopy(row)])
        found = [row for row in rows if all(
            row.get(key) in value if isinstance(value, list) else row.get(key) == value
            for key, value in self.filters.items())]
        if self.values is not None:
            for row in found: row.update(self.values)
        return SimpleNamespace(data=copy.deepcopy(found))


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.db = Database()
        app = FastAPI()
        for router in [evaluation_router.router, pdf_router.router, study_session_router.router]:
            app.include_router(router, prefix='/api')
        app.dependency_overrides[require_current_user] = lambda: 'owner'
        self.client = TestClient(app)
        for module in [evaluation_router, pdf_router, study_session_router]:
            patcher = patch.object(module, 'get_supabase_client', return_value=self.db)
            patcher.start(); self.addCleanup(patcher.stop)
        patcher = patch.object(evaluation_router, 'get_source_reference', return_value=None)
        patcher.start(); self.addCleanup(patcher.stop)
        self.model = AsyncMock(return_value={'score': 7, 'feedback': 'Feedback', 'model_answer': 'Modelo'})
        patcher = patch.object(evaluation_router, 'evaluate_answer', self.model)
        patcher.start(); self.addCleanup(patcher.stop)

    def answer(self, position=1, **extra):
        return self.client.post('/api/evaluate-answer', data={
            'question': 'Pergunta', 'reference_answer': 'Modelo', 'student_answer': 'Resposta',
            'study_session_id': 'session', 'question_position': position, **extra,
        })

    def test_out_of_order_answers_and_retry_keep_one_saved_attempt_per_position(self):
        first = self.answer(3)
        self.assertEqual(first.status_code, 200)
        attempt_id = first.json()['attempt_id']
        self.answer(1)
        self.assertEqual(self.answer(3, retry_attempt_id=attempt_id).status_code, 200)
        self.assertEqual(len(self.db.rows['quiz_sessions']), 2)
        history = self.client.get('/api/study-sessions').json()[0]
        self.assertEqual([item['question_position'] for item in history['attempts']], [1, 3])
        self.assertEqual(history['attempts'][1]['student_answer'], 'Resposta')
        self.assertEqual(history['attempts'][1]['feedback'], 'Feedback')
        self.assertEqual(history['attempts'][1]['score'], 7)

    def test_failed_save_is_not_reported_as_success(self):
        def fail_after_evaluation(**_):
            self.db.fail = True
            return {'score': 7, 'feedback': 'Feedback', 'model_answer': 'Modelo'}
        self.model.side_effect = fail_after_evaluation
        self.assertEqual(self.answer().status_code, 500)

    def test_cannot_update_another_users_attempt(self):
        self.db.rows['quiz_sessions'].append({'id':'foreign','user_id':'someone-else','study_session_id':'session'})
        self.assertEqual(self.answer(retry_attempt_id='foreign').status_code, 404)
        self.model.assert_not_called()

    def test_upload_intents_accept_up_to_50_mib_and_reject_one_byte_more(self):
        for size in [15, 30, 50]:
            with self.subTest(size=size):
                response = self.client.post('/api/upload-intents', json={'filename':'atlas.pdf','size_bytes':size*1024*1024})
                self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.post('/api/upload-intents', json={'filename':'atlas.pdf','size_bytes':50*1024*1024+1}).status_code, 413)

    def test_processes_a_real_30_mib_pdf_and_preserves_text(self):
        writer = PdfWriter()
        page = writer.add_blank_page(width=600, height=800)
        font = DictionaryObject({NameObject('/Type'):NameObject('/Font'), NameObject('/Subtype'):NameObject('/Type1'), NameObject('/BaseFont'):NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):writer._add_object(font)})})
        content = DecodedStreamObject()
        content.set_data(b'BT /F1 12 Tf 50 700 Td (O femur pertence ao membro pelvico.) Tj ET')
        page[NameObject('/Contents')] = writer._add_object(content)
        padding = DecodedStreamObject()
        padding.set_data(b'0' * (30*1024*1024))
        writer._root_object[NameObject('/TestPayload')] = writer._add_object(padding)
        output = io.BytesIO(); writer.write(output)
        pdf_bytes = output.getvalue()
        response = pdf_router.process_pdf_bytes(pdf_bytes, 'atlas.pdf', 'materials/test.pdf', 'owner', 'pt-BR')
        self.assertEqual(response.num_pages, 1)
        self.assertGreater(response.num_chunks, 0)
        self.assertIn('femur', self.db.rows['documents'][0]['chunks'])
        self.assertGreater(self.db.rows['documents'][0]['original_size_bytes'], 30*1024*1024)

    def test_processing_rejects_oversized_pdf_before_extraction(self):
        from fastapi import HTTPException
        with patch.object(pdf_router, 'extract_text_by_page') as extract:
            with self.assertRaises(HTTPException) as caught:
                pdf_router.process_pdf_bytes(bytes(50*1024*1024+1), 'atlas.pdf', 'materials/test.pdf', 'owner', 'pt-BR')
            self.assertEqual(caught.exception.status_code, 413)
            extract.assert_not_called()


if __name__ == '__main__': unittest.main()
