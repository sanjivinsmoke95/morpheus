"""Deterministic offline providers.

These are NOT fake results dressed as real ones — they are an explicit,
labelled fallback so the pipeline runs and is testable without external keys.
Callers treat `available == False` as "no real model", and the extraction/
classification stages abstain (REVIEW_REQUIRED) rather than present stub output
as authoritative (see ai-pipeline.md).

The stub embedder is a real, deterministic hashing embedder: it produces stable
vectors so vector-similarity code paths are exercised end to end.
"""

from __future__ import annotations

import hashlib
import math
import re

from app.core.config import settings
from app.services.ai.base import EmbeddingProvider, LLMProvider


class StubLLMProvider(LLMProvider):
    name = "stub"

    @property
    def available(self) -> bool:
        return False

    def complete_json(self, prompt, schema=None, *, temperature=0.0, max_retries=2) -> dict:
        # No real model configured → abstain. The caller marks REVIEW_REQUIRED.
        return {"_abstain": True, "_reason": "no LLM provider configured (stub)"}

    def complete_text(self, prompt, *, temperature=0.2) -> str:
        return "[stub provider: no LLM configured — configure LLM_PROVIDER for generated text]"


_TOKEN = re.compile(r"[a-z0-9]+")


class StubEmbeddingProvider(EmbeddingProvider):
    """Deterministic bag-of-hashed-tokens embedding, L2-normalized.

    Not semantically rich, but stable and real: identical text → identical vector,
    similar text → higher cosine. Enough to exercise pgvector/retrieval code paths
    offline; a real provider swaps in transparently and re-embeds via migration.
    """

    name = "stub"

    def __init__(self, dim: int | None = None):
        self._dim = dim or settings.embedding_dim

    @property
    def available(self) -> bool:
        return True  # the stub embedder genuinely works offline

    @property
    def dim(self) -> int:
        return self._dim

    @property
    def model(self) -> str:
        return f"stub-hash-{self._dim}"

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self._dim
        for tok in _TOKEN.findall((text or "").lower()):
            h = int(hashlib.sha1(tok.encode()).hexdigest(), 16)
            idx = h % self._dim
            sign = 1.0 if (h >> 8) & 1 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm else vec

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]
