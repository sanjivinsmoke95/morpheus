"""Requirement→standard recommendations with persisted traceability + evidence."""

from typing import Any

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ApplicabilityClass, Confidence, Relevance


class Recommendation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recommendations"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    requirement_id: Mapped[str] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), index=True, nullable=False
    )
    standard_id: Mapped[str] = mapped_column(ForeignKey("standards.id", ondelete="CASCADE"), nullable=False)

    applicability_class: Mapped[str] = mapped_column(String(32), default=ApplicabilityClass.RELATED.value)
    relevance: Mapped[str] = mapped_column(String(8), default=Relevance.LOW.value)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)  # internal, not a "probability"
    retrieval_method: Mapped[str] = mapped_column(String(16), default="hybrid")  # bm25|vector|hybrid
    signals_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    rationale: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String(16), default=Confidence.LOW.value)
    final_rank: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    review_status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING|ACCEPTED|REJECTED|REVIEW
    excluded: Mapped[bool] = mapped_column(Boolean, default=False)
    exclusion_reason: Mapped[str] = mapped_column(String(400), default="")


class RecommendationEvidence(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recommendation_evidence"

    recommendation_id: Mapped[str] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(24), default="scope")  # scope|parameter|product|relationship|...
