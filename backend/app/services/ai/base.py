"""Provider abstractions. The application depends only on these interfaces, never
on a concrete vendor (ai-pipeline.md §1). A deterministic offline fallback keeps
every stage runnable and tests hermetic with no API keys."""

from __future__ import annotations

import abc


class LLMProvider(abc.ABC):
    name: str = "base"

    @property
    @abc.abstractmethod
    def available(self) -> bool:
        """True when a real backend is configured and reachable."""

    @abc.abstractmethod
    def complete_json(self, prompt: str, schema: dict | None = None, *, temperature: float = 0.0,
                      max_retries: int = 2) -> dict:
        """Return a parsed JSON object. On unrecoverable failure return
        {'_abstain': True} so the caller can mark the item REVIEW_REQUIRED."""

    @abc.abstractmethod
    def complete_text(self, prompt: str, *, temperature: float = 0.2) -> str:
        ...


class EmbeddingProvider(abc.ABC):
    name: str = "base"

    @property
    @abc.abstractmethod
    def available(self) -> bool:
        ...

    @property
    @abc.abstractmethod
    def dim(self) -> int:
        ...

    @property
    @abc.abstractmethod
    def model(self) -> str:
        ...

    @abc.abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        ...
