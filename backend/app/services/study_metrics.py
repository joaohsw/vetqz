"""Canonical persisted evaluations used by history and session summaries."""

from decimal import Decimal, ROUND_HALF_UP
from math import isfinite


def valid_score(value):
    return type(value) in (int, float) and isfinite(value) and 0 <= value <= 10


def attempt_order(attempt):
    return (attempt.get("updated_at") or attempt.get("created_at") or "", str(attempt["id"]))


def session_metrics(attempts, planned_count):
    """Keep one current row per position; expose ambiguous legacy rows separately."""
    current = {}
    unplaced = []
    for attempt in sorted(attempts, key=attempt_order):
        position = attempt.get("question_position")
        if type(position) is not int or not 1 <= position <= planned_count:
            unplaced.append(attempt)
            continue
        current[position] = attempt
    selected = [current[position] for position in sorted(current)]
    scores = [Decimal(str(row["score"])) for row in selected if valid_score(row.get("score"))]
    average = float((sum(scores) / len(scores)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)) if scores else None
    return selected, unplaced, len(scores), average
