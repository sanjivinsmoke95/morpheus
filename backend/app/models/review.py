"""Human review decisions with immutable AI + evidence snapshots."""

from typing import Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Review(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reviews"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(24), default="OPEN")


class ReviewDecision(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "review_decisions"

    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), index=True, nullable=False)
    target_type: Mapped[str] = mapped_column(String(24), nullable=False)  # recommendation|gap|conflict|requirement
    target_id: Mapped[str] = mapped_column(String(36), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)  # ReviewDecision enum
    reason: Mapped[str] = mapped_column(Text, default="")
    ai_snapshot_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    evidence_snapshot_json: Mapped[list[Any]] = mapped_column(JSON, default=list)
    decided_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class AnalysisComment(Base, UUIDMixin, TimestampMixin):
    """Collaboration thread on an analysis (Phase 17): officer/reviewer comments,
    reviewer sign-off and return-for-revision notes."""

    __tablename__ = "analysis_comments"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(String(16), default="comment")  # comment | signoff | return
    body: Mapped[str] = mapped_column(Text, nullable=False)
