"""Admin management of authoritative standard records (spec §15).

Only admins call these (enforced in the router). Creating/editing a standard
re-indexes its embedding chunks so retrieval stays consistent. CSV import and
validation help curate an authoritative dataset.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Standard, StandardChunk
from app.services.ai import get_embedder
from app.services.standards.util import normalize_is_number

_REQUIRED = ["is_number", "title"]


def reindex_chunks(db: Session, standard: Standard) -> None:
    db.execute(delete(StandardChunk).where(StandardChunk.standard_id == standard.id))
    db.flush()
    embedder = get_embedder()
    chunks = [
        ("title_scope", f"{standard.title}. {standard.scope or ''}"),
        ("metadata", " ".join((standard.keywords or []) + (standard.product_categories or [])
                              + (standard.materials or []) + [standard.sector or ""])),
    ]
    vectors = embedder.embed([c for _, c in chunks])
    for (ctype, content), vec in zip(chunks, vectors):
        db.add(StandardChunk(standard_id=standard.id, chunk_type=ctype, content=content,
                             embedding=vec, embedding_model=embedder.model))


def create_standard(db: Session, data: dict) -> Standard:
    std = Standard(
        is_number=data["is_number"], is_number_normalized=normalize_is_number(data["is_number"]),
        title=data["title"], scope=data.get("scope", ""), sector=data.get("sector", ""),
        product_categories=data.get("product_categories", []), materials=data.get("materials", []),
        keywords=data.get("keywords", []), status=data.get("status", "ACTIVE"),
        current_version=data.get("current_version", ""), publication_year=data.get("publication_year"),
        data_origin=data.get("data_origin", "CURATED"), source_url=data.get("source_url", ""),
        source_name=data.get("source_name", "admin"), retrieved_at=datetime.now(timezone.utc).isoformat(),
        verification_status=data.get("verification_status", "VERIFIED"),
    )
    db.add(std)
    db.flush()
    reindex_chunks(db, std)
    db.commit()
    return std


def update_standard(db: Session, std: Standard, changes: dict) -> Standard:
    reindex_fields = {"title", "scope", "keywords", "product_categories", "materials", "sector"}
    touched_index = False
    for key, value in changes.items():
        setattr(std, key, value)
        if key in reindex_fields:
            touched_index = True
        if key == "is_number":
            std.is_number_normalized = normalize_is_number(value)
    if touched_index:
        reindex_chunks(db, std)
    db.commit()
    return std


def validate_standard(std: Standard, db: Session) -> dict:
    issues: list[str] = []
    for f in _REQUIRED:
        if not getattr(std, f, None):
            issues.append(f"missing required field: {f}")
    if not std.scope:
        issues.append("no scope — retrieval quality will be weak")
    if not std.keywords:
        issues.append("no keywords")
    dup = db.execute(select(Standard).where(Standard.is_number == std.is_number,
                                            Standard.id != std.id)).scalar_one_or_none()
    if dup:
        issues.append("duplicate is_number")
    return {"ok": len(issues) == 0, "issues": issues}


def import_csv(db: Session, content: bytes) -> dict:
    """CSV columns: is_number,title,scope,sector,keywords,product_categories,materials,current_version.
    keywords/categories/materials are ';'-separated. Rows without is_number+title are rejected."""
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    inserted, updated, rejected = 0, 0, []
    for i, row in enumerate(reader, start=2):
        low = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        is_number, title = low.get("is_number"), low.get("title")
        if not is_number or not title:
            rejected.append({"row": i, "reason": "missing is_number or title"})
            continue
        data = {
            "is_number": is_number, "title": title, "scope": low.get("scope", ""),
            "sector": low.get("sector", ""), "current_version": low.get("current_version", ""),
            "keywords": _split(low.get("keywords")), "product_categories": _split(low.get("product_categories")),
            "materials": _split(low.get("materials")), "data_origin": "CURATED",
        }
        existing = db.execute(select(Standard).where(Standard.is_number == is_number)).scalar_one_or_none()
        if existing:
            update_standard(db, existing, {k: v for k, v in data.items() if k != "is_number"})
            updated += 1
        else:
            create_standard(db, data)
            inserted += 1
    return {"inserted": inserted, "updated": updated, "rejected": rejected}


def _split(value: str | None) -> list[str]:
    return [p.strip() for p in (value or "").split(";") if p.strip()]


def ingestion_status(db: Session) -> dict:
    from app.models import (
        CertificationRecord, QcoRecord, StandardAmendment, StandardRelationship, StandardVersion,
    )

    def count(model):
        from sqlalchemy import func
        return db.execute(select(func.count()).select_from(model)).scalar_one()

    embedder = get_embedder()
    return {
        "standards": count(Standard), "chunks": count(StandardChunk),
        "relationships": count(StandardRelationship), "versions": count(StandardVersion),
        "amendments": count(StandardAmendment), "qco_records": count(QcoRecord),
        "certification_records": count(CertificationRecord),
        "embedding_model": embedder.model,
    }
