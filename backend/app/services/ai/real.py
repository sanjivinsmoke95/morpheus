"""Real LLM + embedding providers (mission Phase 4).

Implements the SAME `LLMProvider` / `EmbeddingProvider` interfaces as the stub, so
the rest of MORPHEUS is unchanged. Activated only by configuration:

    LLM_PROVIDER=openai_compatible|gemini   LLM_API_KEY=...   LLM_BASE_URL=...  LLM_MODEL=...
    EMBEDDING_PROVIDER=openai_compatible|gemini   EMBEDDING_API_KEY=...   EMBEDDING_MODEL=...

With no key the factory keeps the deterministic offline stub, so tests and the
keyless demo are unaffected. Uses only the standard library (urllib) — no new
dependency. Network calls happen lazily and only when a key is present.

These providers PROPOSE (extraction/classification) and embed; deterministic
evidence + rule gates downstream remain authoritative. On any failure they return
an abstain marker so the caller marks the item REVIEW_REQUIRED — never a guess.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from app.services.ai.base import EmbeddingProvider, LLMProvider

logger = logging.getLogger(__name__)
_TIMEOUT = 30


def _post(url: str, payload: dict, headers: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:  # noqa: S310 — trusted, configured endpoint
        return json.loads(resp.read().decode("utf-8"))


# ── OpenAI-compatible (OpenAI, Azure OpenAI, local vLLM/Ollama, etc.) ───────
class OpenAICompatibleLLM(LLMProvider):
    name = "openai_compatible"

    def __init__(self, api_key: str, base_url: str, model: str):
        self._key, self._base, self._model = api_key, base_url.rstrip("/"), model or "gpt-4o-mini"

    @property
    def available(self) -> bool:
        return bool(self._key and self._base)

    def _chat(self, prompt: str, temperature: float) -> str:
        out = _post(f"{self._base}/chat/completions",
                    {"model": self._model, "temperature": temperature,
                     "messages": [{"role": "user", "content": prompt}]},
                    {"Authorization": f"Bearer {self._key}"})
        return out["choices"][0]["message"]["content"]

    def complete_json(self, prompt: str, schema: dict | None = None, *, temperature: float = 0.0,
                      max_retries: int = 2) -> dict:
        for _ in range(max_retries + 1):
            try:
                txt = self._chat(prompt + "\n\nRespond with ONLY valid JSON.", temperature)
                start, end = txt.find("{"), txt.rfind("}")
                if start >= 0 and end > start:
                    return json.loads(txt[start:end + 1])
            except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
                logger.warning("LLM complete_json failed: %s", exc)
        return {"_abstain": True}

    def complete_text(self, prompt: str, *, temperature: float = 0.2) -> str:
        try:
            return self._chat(prompt, temperature)
        except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
            logger.warning("LLM complete_text failed: %s", exc)
            return ""


class OpenAICompatibleEmbedder(EmbeddingProvider):
    name = "openai_compatible"

    def __init__(self, api_key: str, base_url: str, model: str, dim: int):
        self._key, self._base = api_key, base_url.rstrip("/")
        self._model, self._dim = model or "text-embedding-3-small", dim

    @property
    def available(self) -> bool:
        return bool(self._key and self._base)

    @property
    def is_semantic(self) -> bool:
        return True

    @property
    def dim(self) -> int:
        return self._dim

    @property
    def model(self) -> str:
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            out = _post(f"{self._base}/embeddings", {"model": self._model, "input": texts},
                        {"Authorization": f"Bearer {self._key}"})
            return [_l2(d["embedding"]) for d in out["data"]]
        except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
            logger.warning("embedding failed, falling back to zeros: %s", exc)
            return [[0.0] * self._dim for _ in texts]


# ── Google Gemini ──────────────────────────────────────────────────────────
_GEMINI = "https://generativelanguage.googleapis.com/v1beta"


class GeminiLLM(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        self._key, self._model = api_key, model or "gemini-1.5-flash"

    @property
    def available(self) -> bool:
        return bool(self._key)

    def _gen(self, prompt: str, temperature: float) -> str:
        out = _post(f"{_GEMINI}/models/{self._model}:generateContent?key={self._key}",
                    {"contents": [{"parts": [{"text": prompt}]}],
                     "generationConfig": {"temperature": temperature}}, {})
        return out["candidates"][0]["content"]["parts"][0]["text"]

    def complete_json(self, prompt: str, schema: dict | None = None, *, temperature: float = 0.0,
                      max_retries: int = 2) -> dict:
        for _ in range(max_retries + 1):
            try:
                txt = self._gen(prompt + "\n\nRespond with ONLY valid JSON.", temperature)
                start, end = txt.find("{"), txt.rfind("}")
                if start >= 0 and end > start:
                    return json.loads(txt[start:end + 1])
            except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
                logger.warning("Gemini complete_json failed: %s", exc)
        return {"_abstain": True}

    def complete_text(self, prompt: str, *, temperature: float = 0.2) -> str:
        try:
            return self._gen(prompt, temperature)
        except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
            logger.warning("Gemini complete_text failed: %s", exc)
            return ""


class GeminiEmbedder(EmbeddingProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str, dim: int):
        self._key, self._model, self._dim = api_key, model or "text-embedding-004", dim

    @property
    def available(self) -> bool:
        return bool(self._key)

    @property
    def is_semantic(self) -> bool:
        return True

    @property
    def dim(self) -> int:
        return self._dim

    @property
    def model(self) -> str:
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        vecs: list[list[float]] = []
        for t in texts:
            try:
                out = _post(f"{_GEMINI}/models/{self._model}:embedContent?key={self._key}",
                            {"model": f"models/{self._model}", "content": {"parts": [{"text": t}]}}, {})
                vecs.append(_l2(out["embedding"]["values"]))
            except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
                logger.warning("Gemini embedding failed: %s", exc)
                vecs.append([0.0] * self._dim)
        return vecs


def _l2(v: list[float]) -> list[float]:
    n = sum(x * x for x in v) ** 0.5
    return [x / n for x in v] if n else v
