import unittest

from app.services.study_metrics import session_metrics


class MetricsTests(unittest.TestCase):
    def test_invalid_and_missing_scores_are_not_zero(self):
        rows = [{"id": str(i), "question_position": i, "score": score}
                for i, score in enumerate([None, True, float('nan'), -1, 11, 0], 1)]
        selected, unplaced, count, average = session_metrics(rows, 6)
        self.assertEqual((len(selected), unplaced, count, average), (6, [], 1, 0))

    def test_decimal_rounding_and_empty(self):
        self.assertEqual(session_metrics([], 3)[2:], (0, None))
        for value, expected in [(2.25, 2.3), (1.15, 1.2), (9.95, 10)]:
            with self.subTest(value=value):
                self.assertEqual(session_metrics([
                    {"id":"a", "question_position":1, "score":value}
                ], 1)[3], expected)
