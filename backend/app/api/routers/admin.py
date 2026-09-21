"""Admin surface. Phase 1: system health only (more in later phases)."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db import get_db
from app.models import User
from app.models.enums import Role
from app.services.ai import get_embedder, get_llm
from app.services.graph.client import graph_status
from app.services.object_store import get_object_store

router = APIRouter(prefix="/admin", tags=["admin"])


def _db_status(db: Session) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "unavailable", "detail": str(exc)[:200]}


@router.get("/health")
def health(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
) -> dict:
    llm = get_llm()
    emb = get_embedder()
    components = {
        "database": _db_status(db),
        "neo4j": graph_status(),
        "object_store": {"status": "ok" if get_object_store().healthy() else "unavailable"},
        "llm_provider": {"name": llm.name, "available": llm.available},
        "embedding_provider": {"name": emb.name, "available": emb.available, "dim": emb.dim},
    }
    hard_deps_ok = components["database"]["status"] == "ok" and components["object_store"]["status"] == "ok"
    return {"status": "ok" if hard_deps_ok else "degraded", "components": components}
