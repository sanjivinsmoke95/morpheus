"""Load the demo standards corpus and build embeddings. Idempotent."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.demo_standards import DEMO_STANDARDS
from app.models import Standard, StandardChunk
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
        logger.info("Seeded %d demo standards.", created)
    return created
