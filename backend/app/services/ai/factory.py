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
    key = settings.llm_api_key
    if choice == "openai_compatible" and key and settings.llm_base_url:
        from app.services.ai.real import OpenAICompatibleLLM
        logger.info("LLM provider: openai_compatible (%s)", settings.llm_model or "default")
        return OpenAICompatibleLLM(key, settings.llm_base_url, settings.llm_model)
    if choice == "gemini" and key:
        from app.services.ai.real import GeminiLLM
        logger.info("LLM provider: gemini (%s)", settings.llm_model or "gemini-1.5-flash")
        return GeminiLLM(key, settings.llm_model)
    if choice in ("openai_compatible", "gemini"):
        logger.info("LLM_PROVIDER=%s set but no API key/base — using the offline stub.", choice)
    return StubLLMProvider()


@lru_cache
def get_embedder() -> EmbeddingProvider:
    choice = (settings.embedding_provider or "stub").lower()
    key = settings.embedding_api_key or settings.llm_api_key
    dim = settings.embedding_dim
    if choice == "openai_compatible" and key and (settings.embedding_base_url or settings.llm_base_url):
        from app.services.ai.real import OpenAICompatibleEmbedder
        base = settings.embedding_base_url or settings.llm_base_url
        logger.info("Embedding provider: openai_compatible (semantic)")
        return OpenAICompatibleEmbedder(key, base, settings.embedding_model, dim)
    if choice == "gemini" and key:
        from app.services.ai.real import GeminiEmbedder
        logger.info("Embedding provider: gemini (semantic)")
        return GeminiEmbedder(key, settings.embedding_model, dim)
    if choice in ("openai_compatible", "gemini"):
        logger.info("EMBEDDING_PROVIDER=%s set but no API key — using the offline hashing stub.", choice)
    return StubEmbeddingProvider()
