"""Human-like timing primitives, kept independent for deterministic tests."""

from __future__ import annotations

from dataclasses import dataclass
import random


@dataclass(frozen=True)
class TypingConfig:
    wpm: float = 45.0
    variation: float = 0.25
    pause_chance: float = 0.035
    pause_min: float = 0.25
    pause_max: float = 1.1
    typo_chance: float = 0.01
    word_chunk_chance: float = 0.70

    def validate(self) -> None:
        if not 1 <= self.wpm <= 300:
            raise ValueError("WPM 必须在 1–300 之间")
        if not 0 <= self.variation <= 1:
            raise ValueError("随机波动必须在 0–1 之间")
        if not 0 <= self.pause_chance <= 1 or not 0 <= self.typo_chance <= 1 or not 0 <= self.word_chunk_chance <= 1:
            raise ValueError("概率必须在 0–1 之间")
        if self.pause_min < 0 or self.pause_max < self.pause_min:
            raise ValueError("停顿区间无效")


class Rhythm:
    def __init__(self, config: TypingConfig, seed: int | None = None):
        config.validate()
        self.config = config
        self.random = random.Random(seed)

    def delay(self, char: str) -> float:
        # Conventional WPM uses five characters per word.
        base = 60.0 / (self.config.wpm * 5.0)
        factor = self.random.uniform(1 - self.config.variation, 1 + self.config.variation)
        delay = max(0.005, base * factor)
        if char in ".!?。！？\n":
            delay += self.random.uniform(0.12, 0.45)
        elif char in ",;:，；：":
            delay += self.random.uniform(0.06, 0.22)
        if self.random.random() < self.config.pause_chance:
            delay += self.random.uniform(self.config.pause_min, self.config.pause_max)
        return delay

    def typo_for(self, char: str) -> str | None:
        if not char.isascii() or not char.isalpha():
            return None
        if self.random.random() >= self.config.typo_chance:
            return None
        alphabet = "abcdefghijklmnopqrstuvwxyz"
        wrong = self.random.choice(alphabet.replace(char.lower(), ""))
        return wrong.upper() if char.isupper() else wrong

    def should_chunk_word(self) -> bool:
        return self.random.random() < self.config.word_chunk_chance
