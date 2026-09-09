"""Difficulty levels shared by question generation and answer evaluation."""

from typing import Literal

Difficulty = Literal["easy", "medium", "hard"]
DEFAULT_DIFFICULTY: Difficulty = "medium"

