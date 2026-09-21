"""Standard relationships, versions, and amendments (Phase 3).

Relationships are typed and NOT equally authoritative — each carries its own
confidence, provenance, and (optionally) an evidence row, so a click in the graph
resolves to stored metadata (knowledge-graph.md).
"""

from datetime import date
from typing import Any

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import Confidence, DataOrigin, VerificationStatus


class StandardRelationship(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "standard_relationships"
    __table_args__ = (UniqueConstraint("from_standard_id", "to_standard_id", "relationship_type",
                                       name="uq_relationship"),)

    from_standard_id: Mapped[str] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), index=True, nullable=False)
    to_standard_id: Mapped[str] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), index=True, nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(32), nullable=False)  # RelationshipType enum
    note: Mapped[str] = mapped_column(Text, default="")
    relationship_confidence: Mapped[str] = mapped_column(String(16), default=Confidence.MEDIUM.value)
    evidence_id: Mapped[str | None] = mapped_column(ForeignKey("evidence.id", ondelete="SET NULL"))

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="DEMO")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    verification_status: Mapped[str] = mapped_column(String(16), default=VerificationStatus.UNVERIFIED.value)


class StandardVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "standard_versions"

    standard_id: Mapped[str] = mapped_column(ForeignKey("standards.id", ondelete="CASCADE"), index=True, nullable=False)
    version_label: Mapped[str] = mapped_column(String(48), nullable=False)
    effective_date: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="DEMO")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")


class StandardAmendment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "standard_amendments"

    standard_id: Mapped[str] = mapped_column(ForeignKey("standards.id", ondelete="CASCADE"), index=True, nullable=False)
    amendment_no: Mapped[str] = mapped_column(String(48), nullable=False)
    amendment_date: Mapped[date | None] = mapped_column(Date)
    affected_clauses: Mapped[list[Any]] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="DEMO")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    verification_status: Mapped[str] = mapped_column(String(16), default=VerificationStatus.UNVERIFIED.value)
