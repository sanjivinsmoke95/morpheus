"""Load the demo standards corpus and build embeddings. Idempotent."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from datetime import date

from app.data.demo_standards import (
    DEMO_AMENDMENTS, DEMO_CERT, DEMO_QCO, DEMO_RELATIONSHIPS, DEMO_STANDARDS, DEMO_VERSIONS,
)
from app.models import (
    CertificationRecord, Evidence, QcoRecord, Standard, StandardAmendment, StandardChunk,
    StandardRelationship, StandardVersion,
)
from app.models.enums import DataOrigin
from app.services.ai import get_embedder
from app.services.standards.util import normalize_is_number

logger = logging.getLogger(__name__)


def _chunks_for(std: dict) -> list[tuple[str, str]]:
    title_scope = f"{std['title']}. {std.get('scope', '')}"
    metadata = " ".join(
        std.get("keywords", [])
        + std.get("product_categories", [])
        + std.get("materials", [])
        + [std.get("sector", "")]
    )
    return [("title_scope", title_scope), ("metadata", metadata)]


def seed_demo_standards(db: Session) -> int:
    """Insert demo standards + embedded chunks that don't already exist."""
    embedder = get_embedder()
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    for std in DEMO_STANDARDS:
        exists = db.execute(select(Standard).where(Standard.is_number == std["is_number"])).scalar_one_or_none()
        if exists:
            continue
        record = Standard(
            is_number=std["is_number"],
            is_number_normalized=normalize_is_number(std["is_number"]),
            title=std["title"],
            scope=std.get("scope", ""),
            sector=std.get("sector", ""),
            product_categories=std.get("product_categories", []),
            materials=std.get("materials", []),
            keywords=std.get("keywords", []),
            status=std.get("status", "ACTIVE"),
            publication_year=std.get("publication_year"),
            revision_year=std.get("revision_year"),
            current_version=std.get("current_version", ""),
            data_origin=DataOrigin.DEMO_SYNTHETIC.value,
            source_name="DEMO",
            source_url="",
            retrieved_at=now,
        )
        db.add(record)
        db.flush()
        chunks = _chunks_for(std)
        vectors = embedder.embed([c for _, c in chunks])
        for (ctype, content), vec in zip(chunks, vectors):
            db.add(StandardChunk(standard_id=record.id, chunk_type=ctype, content=content,
                                 embedding=vec, embedding_model=embedder.model))
        created += 1
    if created:
        db.commit()
    created += _seed_public_metadata(db, now)
    _seed_graph(db, now)
    if created:
        logger.info("Seeded %d standards (demo + public metadata) + graph.", created)
    return created


def _seed_public_metadata(db: Session, now: str) -> int:
    """Seed real public IS metadata (number/title/sector only) — origin PUBLIC_METADATA."""
    from app.data.public_standards import PUBLIC_STANDARDS
    embedder = get_embedder()
    created = 0
    for std in PUBLIC_STANDARDS:
        if db.execute(select(Standard).where(Standard.is_number == std["is_number"])).scalar_one_or_none():
            continue
        scope = std.get("title", "")  # functional summary; no copyrighted clause text
        record = Standard(
            is_number=std["is_number"], is_number_normalized=normalize_is_number(std["is_number"]),
            title=std["title"], scope=scope, sector=std.get("sector", ""),
            product_categories=std.get("product_categories", []), materials=std.get("materials", []),
            keywords=std.get("keywords", []), status="ACTIVE", current_version=std["is_number"].split(":")[-1].strip(),
            data_origin=DataOrigin.PUBLIC_METADATA.value, source_name="PUBLIC_METADATA",
            source_url="", retrieved_at=now,
        )
        db.add(record)
        db.flush()
        chunks = _chunks_for({**std, "scope": scope})
        vectors = embedder.embed([c for _, c in chunks])
        for (ctype, content), vec in zip(chunks, vectors):
            db.add(StandardChunk(standard_id=record.id, chunk_type=ctype, content=content,
                                 embedding=vec, embedding_model=embedder.model))
        created += 1
    if created:
        db.commit()
    return created


def _by_number(db: Session) -> dict:
    return {s.is_number: s for s in db.execute(select(Standard)).scalars()}


def _seed_graph(db: Session, now: str) -> None:
    """Relationships (with evidence), versions, and amendments. Idempotent."""
    idx = _by_number(db)
    # Relationships
    existing_rel = {
        (r.from_standard_id, r.to_standard_id, r.relationship_type)
        for r in db.execute(select(StandardRelationship)).scalars()
    }
    for frm, to, rtype, note, conf in DEMO_RELATIONSHIPS:
        a, b = idx.get(frm), idx.get(to)
        if not a or not b or (a.id, b.id, rtype) in existing_rel:
            continue
        ev = Evidence(source_type="standard_relationship", source_name="DEMO",
                      text=f"{frm} {rtype} {to}: {note}", retrieved_at=now,
                      relationship_type=rtype, data_origin=DataOrigin.DEMO_SYNTHETIC.value)
        db.add(ev)
        db.flush()
        db.add(StandardRelationship(from_standard_id=a.id, to_standard_id=b.id, relationship_type=rtype,
                                    note=note, relationship_confidence=conf, evidence_id=ev.id,
                                    data_origin=DataOrigin.DEMO_SYNTHETIC.value, source_name="DEMO", retrieved_at=now))
    # Versions
    have_versions = {v.standard_id for v in db.execute(select(StandardVersion)).scalars()}
    for entry in DEMO_VERSIONS:
        std = idx.get(entry["is_number"])
        if not std or std.id in have_versions:
            continue
        for v in entry["versions"]:
            db.add(StandardVersion(standard_id=std.id, version_label=v["version_label"],
                                   is_current=v["is_current"], notes=v.get("notes", ""),
                                   data_origin=DataOrigin.DEMO_SYNTHETIC.value, source_name="DEMO", retrieved_at=now))
    # Amendments
    have_amend = {a.standard_id for a in db.execute(select(StandardAmendment)).scalars()}
    for entry in DEMO_AMENDMENTS:
        std = idx.get(entry["is_number"])
        if not std or std.id in have_amend:
            continue
        for am in entry["amendments"]:
            db.add(StandardAmendment(standard_id=std.id, amendment_no=am["amendment_no"],
                                     amendment_date=date.fromisoformat(am["amendment_date"]) if am.get("amendment_date") else None,
                                     affected_clauses=am.get("affected_clauses", []), summary=am.get("summary", ""),
                                     data_origin=DataOrigin.DEMO_SYNTHETIC.value, source_name="DEMO", retrieved_at=now))
    # QCO
    have_qco = {q.standard_id for q in db.execute(select(QcoRecord)).scalars()}
    for entry in DEMO_QCO:
        std = idx.get(entry["is_number"])
        if not std or std.id in have_qco:
            continue
        db.add(QcoRecord(standard_id=std.id, product_description=entry.get("product_description", ""),
                         qco_status=entry["qco_status"], order_name=entry.get("order_name", ""),
                         effective_date=date.fromisoformat(entry["effective_date"]) if entry.get("effective_date") else None,
                         notes=entry.get("notes", ""), data_origin=DataOrigin.DEMO_SYNTHETIC.value,
                         source_name="DEMO", retrieved_at=now))
    # Certification
    have_cert = {c.standard_id for c in db.execute(select(CertificationRecord)).scalars()}
    for entry in DEMO_CERT:
        std = idx.get(entry["is_number"])
        if not std or std.id in have_cert:
            continue
        db.add(CertificationRecord(standard_id=std.id, scheme=entry.get("scheme", ""),
                                   product_description=entry.get("product_description", ""),
                                   requirement=entry.get("requirement", ""),
                                   effective_date=date.fromisoformat(entry["effective_date"]) if entry.get("effective_date") else None,
                                   data_origin=DataOrigin.DEMO_SYNTHETIC.value, source_name="DEMO", retrieved_at=now))
    db.commit()
