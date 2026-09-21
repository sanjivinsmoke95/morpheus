"""Admin surface: system health + authoritative-data management (spec §15).

Only ADMIN may mutate standards / relationships / QCO / certification records.
Officers can add a standard to a recommendation via review, but never edit the
authoritative catalogue here.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db import get_db
from app.models import (
    CertificationRecord, Evidence, QcoRecord, Standard, StandardRelationship, User,
)
from app.models.enums import Role
from app.schemas.admin import (
    CertificationCreate, QcoCreate, RelationshipCreate, StandardCreate, StandardUpdate,
)
from app.services.ai import get_embedder, get_llm
from app.services.graph.client import graph_status
from app.services.object_store import get_object_store
from app.services.standards import manage

router = APIRouter(prefix="/admin", tags=["admin"])
_admin = Depends(require_roles(Role.ADMIN))


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


@router.get("/ingestion")
def ingestion(db: Session = Depends(get_db), _: User = _admin) -> dict:
    return manage.ingestion_status(db)


# --- standards management ---------------------------------------------------
def _std_or_404(db: Session, standard_id: str) -> Standard:
    std = db.get(Standard, standard_id)
    if not std:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Standard not found.")
    return std


@router.post("/standards", status_code=status.HTTP_201_CREATED)
def create_standard(payload: StandardCreate, db: Session = Depends(get_db), _: User = _admin) -> dict:
    if db.execute(select(Standard).where(Standard.is_number == payload.is_number)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "A standard with that number already exists.")
    std = manage.create_standard(db, payload.model_dump())
    return {"id": std.id, "is_number": std.is_number}


@router.patch("/standards/{standard_id}")
def update_standard(standard_id: str, payload: StandardUpdate, db: Session = Depends(get_db), _: User = _admin) -> dict:
    std = _std_or_404(db, standard_id)
    manage.update_standard(db, std, payload.model_dump(exclude_unset=True))
    return {"id": std.id, "is_number": std.is_number}


@router.post("/standards/{standard_id}/validate")
def validate_standard(standard_id: str, db: Session = Depends(get_db), _: User = _admin) -> dict:
    return manage.validate_standard(_std_or_404(db, standard_id), db)


@router.post("/standards/import")
async def import_standards(file: UploadFile, db: Session = Depends(get_db), _: User = _admin) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Empty CSV.")
    return manage.import_csv(db, data)


# --- relationships / QCO / certification ------------------------------------
@router.post("/relationships", status_code=status.HTTP_201_CREATED)
def create_relationship(payload: RelationshipCreate, db: Session = Depends(get_db), _: User = _admin) -> dict:
    frm = db.execute(select(Standard).where(Standard.is_number == payload.from_is_number)).scalar_one_or_none()
    to = db.execute(select(Standard).where(Standard.is_number == payload.to_is_number)).scalar_one_or_none()
    if not frm or not to:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Both standards must exist.")
    now = datetime.now(timezone.utc).isoformat()
    ev = Evidence(source_type="standard_relationship", source_name=payload.source_name,
                  text=f"{payload.from_is_number} {payload.relationship_type} {payload.to_is_number}: {payload.note}",
                  retrieved_at=now, relationship_type=payload.relationship_type, data_origin=payload.data_origin)
    db.add(ev)
    db.flush()
    rel = StandardRelationship(from_standard_id=frm.id, to_standard_id=to.id,
                               relationship_type=payload.relationship_type, note=payload.note,
                               relationship_confidence=payload.relationship_confidence, evidence_id=ev.id,
                               data_origin=payload.data_origin, source_name=payload.source_name, retrieved_at=now)
    db.add(rel)
    db.commit()
    return {"id": rel.id}


@router.post("/qco", status_code=status.HTTP_201_CREATED)
def create_qco(payload: QcoCreate, db: Session = Depends(get_db), _: User = _admin) -> dict:
    std = db.execute(select(Standard).where(Standard.is_number == payload.is_number)).scalar_one_or_none()
    if not std:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Standard not found.")
    rec = QcoRecord(standard_id=std.id, qco_status=payload.qco_status, product_description=payload.product_description,
                    order_name=payload.order_name, notes=payload.notes, data_origin=payload.data_origin,
                    source_name=payload.source_name, retrieved_at=datetime.now(timezone.utc).isoformat())
    db.add(rec)
    db.commit()
    return {"id": rec.id}


@router.post("/certification", status_code=status.HTTP_201_CREATED)
def create_certification(payload: CertificationCreate, db: Session = Depends(get_db), _: User = _admin) -> dict:
    std = db.execute(select(Standard).where(Standard.is_number == payload.is_number)).scalar_one_or_none()
    if not std:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Standard not found.")
    rec = CertificationRecord(standard_id=std.id, scheme=payload.scheme, product_description=payload.product_description,
                              requirement=payload.requirement, data_origin=payload.data_origin,
                              source_name=payload.source_name, retrieved_at=datetime.now(timezone.utc).isoformat())
    db.add(rec)
    db.commit()
    return {"id": rec.id}
