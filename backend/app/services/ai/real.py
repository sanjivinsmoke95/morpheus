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


from typing import Any
from pydantic import BaseModel, ValidationError


def _validate_with_schema(data: dict, schema: Any | None) -> tuple[dict, bool, str]:
    if schema is None:
        return data, True, ""
    if isinstance(schema, type) and issubclass(schema, BaseModel):
        try:
            validated = schema.model_validate(data)
            return validated.model_dump(), True, ""
        except ValidationError as exc:
            return data, False, f"Pydantic schema validation failed: {exc}"
        except Exception as exc:
            return data, False, f"Schema validation error: {exc}"
    if isinstance(schema, dict):
        required = schema.get("required", [])
        missing = [k for k in required if k not in data]
        if missing:
            return data, False, f"Missing required fields: {', '.join(missing)}"
    return data, True, ""


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

    def complete_json(self, prompt: str, schema: Any | None = None, *, temperature: float = 0.0,
                      max_retries: int = 2) -> dict:
        cur_prompt = prompt
        schema_hint = ""
        if isinstance(schema, type) and issubclass(schema, BaseModel):
            schema_hint = f"\nOutput must conform to this JSON schema:\n{json.dumps(schema.model_json_schema())}"
        elif isinstance(schema, dict):
            schema_hint = f"\nOutput must conform to this schema:\n{json.dumps(schema)}"

        last_error = "unknown_error"
        for attempt in range(max_retries + 1):
            try:
                full_prompt = cur_prompt + schema_hint + "\n\nRespond with ONLY valid JSON."
                txt = self._chat(full_prompt, temperature)
                start, end = txt.find("{"), txt.rfind("}")
                if start >= 0 and end > start:
                    parsed = json.loads(txt[start:end + 1])
                    val_dict, is_valid, err_msg = _validate_with_schema(parsed, schema)
                    if is_valid:
                        return val_dict
                    logger.warning("Attempt %d JSON schema validation failed: %s", attempt + 1, err_msg)
                    last_error = err_msg
                    cur_prompt = (
                        prompt
                        + f"\n\n[REPAIR INSTRUCTION]: Your previous output failed schema validation: {err_msg}."
                        f"\nPlease repair the JSON output to strictly satisfy all schema requirements."
                    )
                else:
                    last_error = "No JSON object found in response"
            except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
                logger.warning("LLM complete_json attempt %d failed: %s", attempt + 1, exc)
                last_error = str(exc)
        return {"_abstain": True, "_error": "schema_validation_failed", "_detail": last_error}

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

    def complete_json(self, prompt: str, schema: Any | None = None, *, temperature: float = 0.0,
                      max_retries: int = 2) -> dict:
        cur_prompt = prompt
        schema_hint = ""
        if isinstance(schema, type) and issubclass(schema, BaseModel):
            schema_hint = f"\nOutput must conform to this JSON schema:\n{json.dumps(schema.model_json_schema())}"
        elif isinstance(schema, dict):
            schema_hint = f"\nOutput must conform to this schema:\n{json.dumps(schema)}"

        last_error = "unknown_error"
        for attempt in range(max_retries + 1):
            try:
                full_prompt = cur_prompt + schema_hint + "\n\nRespond with ONLY valid JSON."
                txt = self._gen(full_prompt, temperature)
                start, end = txt.find("{"), txt.rfind("}")
                if start >= 0 and end > start:
                    parsed = json.loads(txt[start:end + 1])
                    val_dict, is_valid, err_msg = _validate_with_schema(parsed, schema)
                    if is_valid:
                        return val_dict
                    logger.warning("Gemini attempt %d JSON schema validation failed: %s", attempt + 1, err_msg)
                    last_error = err_msg
                    cur_prompt = (
                        prompt
                        + f"\n\n[REPAIR INSTRUCTION]: Your previous output failed schema validation: {err_msg}."
                        f"\nPlease repair the JSON output to strictly satisfy all schema requirements."
                    )
                else:
                    last_error = "No JSON object found in response"
            except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
                logger.warning("Gemini complete_json attempt %d failed: %s", attempt + 1, exc)
                last_error = str(exc)
        return {"_abstain": True, "_error": "schema_validation_failed", "_detail": last_error}

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
