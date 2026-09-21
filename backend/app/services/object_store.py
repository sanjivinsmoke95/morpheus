"""File/object storage abstraction (documents, reports).

`LocalObjectStore` for dev; an S3-compatible implementation swaps in for prod
behind the same interface. Nothing else in the app touches the filesystem.
"""

from __future__ import annotations

import abc
import os
from pathlib import Path

from app.core.config import settings


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


_store: ObjectStore | None = None


def get_object_store() -> ObjectStore:
    global _store
    if _store is None:
        _store = LocalObjectStore()
    return _store
