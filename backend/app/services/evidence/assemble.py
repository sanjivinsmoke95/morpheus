"""Build first-class evidence rows (evidence-model.md). Every recommendation is
grounded before it is persisted; an ungrounded finding is capped at LOW / abstains.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Evidence


def _checksum(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def tender_evidence(db: Session, requirement, document_id: str) -> Evidence:
    """The tender passage a requirement/recommendation is anchored to."""
    ev = Evidence(
        source_type="tender_document",
        source_name="Uploaded tender",
        document_id=document_id,
        page=requirement.source_page,
        section=requirement.source_section or "",
        text=requirement.description,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=_checksum(requirement.description),
        data_origin="CURATED",
    )
    db.add(ev)
    db.flush()
    return ev


def standard_evidence(db: Session, standard, matched_text: str = "") -> Evidence:
    """The standard record supporting a match (title/scope), with its provenance."""
    text = matched_text or f"{standard.title}. {standard.scope}"
    ev = Evidence(
        source_type="standard_record",
        source_name=standard.source_name or "DEMO",
        source_url=standard.source_url or "",
        section="",
        text=text[:1000],
        retrieved_at=standard.retrieved_at or datetime.now(timezone.utc).isoformat(),
        checksum_sha256=_checksum(text),
        data_origin=standard.data_origin,
    )
    db.add(ev)
    db.flush()
    return ev
