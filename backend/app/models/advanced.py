"""Phase 6: historical tenders + feedback capture."""

from typing import Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DataOrigin


class HistoricalTender(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "historical_tenders"

    title: Mapped[str] = mapped_column(String(300), default="")
    product_summary: Mapped[str] = mapped_column(Text, default="")
    sector: Mapped[str] = mapped_column(String(48), default="")
    standards_used: Mapped[list[Any]] = mapped_column(JSON, default=list)  # list[is_number]
    source_analysis_id: Mapped[str | None] = mapped_column(String(36))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.CURATED.value)


class Feedback(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "feedback"

    analysis_id: Mapped[str | None] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    recommendation_id: Mapped[str | None] = mapped_column(ForeignKey("recommendations.id", ondelete="CASCADE"))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decision: Mapped[str] = mapped_column(String(20), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
