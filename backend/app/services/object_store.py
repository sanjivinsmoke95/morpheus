"""File/object storage abstraction (documents, reports).

`LocalObjectStore` for dev; `SupabaseObjectStore` when SUPABASE_URL + service
role key are set (Vercel/prod). Nothing else in the app touches the filesystem.
"""

from __future__ import annotations

import abc
import logging
import os
from pathlib import Path
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ObjectStore(abc.ABC):
    @abc.abstractmethod
    def put(self, key: str, data: bytes) -> str: ...

    @abc.abstractmethod
    def get(self, key: str) -> bytes: ...

    @abc.abstractmethod
    def exists(self, key: str) -> bool: ...

    @abc.abstractmethod
    def healthy(self) -> bool: ...


class LocalObjectStore(ObjectStore):
    def __init__(self, root: str | None = None):
        self.root = Path(root or settings.object_store_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Prevent path traversal — keys are opaque storage keys, not user paths.
        safe = key.replace("..", "_").lstrip("/")
        p = (self.root / safe).resolve()
        if self.root.resolve() not in p.parents and p != self.root.resolve():
            raise ValueError("invalid storage key")
        return p

    def put(self, key: str, data: bytes) -> str:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return key

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

    def healthy(self) -> bool:
        try:
            probe = self.root / ".health"
            probe.write_text("ok")
            probe.unlink(missing_ok=True)
            return os.access(self.root, os.W_OK)
        except Exception:
            return False


class SupabaseObjectStore(ObjectStore):
    """Supabase Storage via the REST API (service role; bucket is private)."""

    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        bucket: str | None = None,
    ):
        self.base = (url or settings.supabase_url).rstrip("/")
        self.key = key or settings.supabase_service_role_key
        self.bucket = bucket or settings.supabase_storage_bucket
        if not self.base or not self.key:
            raise ValueError("Supabase URL and service role key are required")

    def _headers(self, extra: dict | None = None) -> dict[str, str]:
        h = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
        }
        if extra:
            h.update(extra)
        return h

    def _object_url(self, key: str) -> str:
        safe = quote(key.replace("..", "_").lstrip("/"), safe="/")
        return f"{self.base}/storage/v1/object/{self.bucket}/{safe}"

    def put(self, key: str, data: bytes) -> str:
        r = httpx.post(
            self._object_url(key),
            headers=self._headers({"x-upsert": "true", "Content-Type": "application/octet-stream"}),
            content=data,
            timeout=60.0,
        )
        r.raise_for_status()
        return key

    def get(self, key: str) -> bytes:
        r = httpx.get(self._object_url(key), headers=self._headers(), timeout=60.0)
        r.raise_for_status()
        return r.content

    def exists(self, key: str) -> bool:
        try:
            r = httpx.head(self._object_url(key), headers=self._headers(), timeout=15.0)
            if r.status_code == 200:
                return True
            if r.status_code in (404, 400):
                return False
            # Some Storage versions don't implement HEAD — fall back to GET range.
            r = httpx.get(self._object_url(key), headers=self._headers(), timeout=15.0)
            return r.status_code == 200
        except httpx.HTTPError:
            return False

    def healthy(self) -> bool:
        try:
            r = httpx.get(
                f"{self.base}/storage/v1/bucket/{self.bucket}",
                headers=self._headers(),
                timeout=10.0,
            )
            return r.status_code == 200
        except Exception as exc:  # noqa: BLE001
            logger.warning("Supabase storage health failed: %s", exc)
            return False


_store: ObjectStore | None = None


def reset_object_store() -> None:
    global _store
    _store = None


def get_object_store() -> ObjectStore:
    global _store
    if _store is None:
        if settings.uses_supabase_storage:
            _store = SupabaseObjectStore()
        else:
            _store = LocalObjectStore()
    return _store
