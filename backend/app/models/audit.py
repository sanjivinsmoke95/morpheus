"""Audit outputs: coverage, gaps, conflicts (Phase 4)."""

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import CoverageClass


class CoverageResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "coverage_results"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    requirement_id: Mapped[str | None] = mapped_column(ForeignKey("requirements.id", ondelete="CASCADE"))
    standard_id: Mapped[str | None] = mapped_column(ForeignKey("standards.id", ondelete="SET NULL"))
    coverage: Mapped[str] = mapped_column(String(16), default=CoverageClass.UNKNOWN.value)
    explanation: Mapped[str] = mapped_column(Text, default="")
    evidence_id: Mapped[str | None] = mapped_column(ForeignKey("evidence.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(16), default="PENDING")


class Gap(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "gaps"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    gap_type: Mapped[str] = mapped_column(String(32), default="missing")  # missing_testing|missing_safety|...
    description: Mapped[str] = mapped_column(Text, default="")
    related_standard_id: Mapped[str | None] = mapped_column(ForeignKey("standards.id", ondelete="SET NULL"))
    severity: Mapped[str] = mapped_column(String(12), default="medium")
    # A gap is only "mandatory" with authoritative evidence — default False.
    is_mandatory_claim: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_id: Mapped[str | None] = mapped_column(ForeignKey("evidence.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(16), default="POTENTIAL")


class Conflict(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conflicts"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    conflict_type: Mapped[str] = mapped_column(String(32), default="TECHNICAL_PARAMETER")  # or VERSION
    parameter: Mapped[str] = mapped_column(String(48), default="")
    value_a: Mapped[str] = mapped_column(String(64), default="")
    unit_a: Mapped[str] = mapped_column(String(24), default="")
    source_a: Mapped[str] = mapped_column(String(64), default="")
    value_b: Mapped[str] = mapped_column(String(64), default="")
    unit_b: Mapped[str] = mapped_column(String(24), default="")
    source_b: Mapped[str] = mapped_column(String(64), default="")
    severity: Mapped[str] = mapped_column(String(12), default="high")
    explanation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="REVIEW_REQUIRED")
