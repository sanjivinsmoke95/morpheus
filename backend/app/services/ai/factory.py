"""Selects providers from configuration, degrading to the stub safely."""

from __future__ import annotations

import logging
from functools import lru_cache

from app.core.config import settings
from app.services.ai.base import EmbeddingProvider, LLMProvider
from app.services.ai.stub import StubEmbeddingProvider, StubLLMProvider

logger = logging.getLogger(__name__)


@lru_cache
def get_llm() -> LLMProvider:
    choice = (settings.llm_provider or "stub").lower()
    if choice in ("openai_compatible", "gemini"):
        # Real providers slot in here (Phase 2+). Until then, degrade to the stub.
        logger.info("LLM_PROVIDER=%s not wired yet; using the stub provider.", choice)
    return StubLLMProvider()


@lru_cache
def get_embedder() -> EmbeddingProvider:
    choice = (settings.embedding_provider or "stub").lower()
    if choice in ("openai_compatible", "gemini"):
        logger.info("EMBEDDING_PROVIDER=%s not wired yet; using the stub embedder.", choice)
    return StubEmbeddingProvider()
