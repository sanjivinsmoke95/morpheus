"""An analysis run over a document (the orchestrator's unit of work)."""

from typing import Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AnalysisStatus


class Analysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "analyses"

    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(300), default="")
    sector: Mapped[str] = mapped_column(String(48), default="")
    status: Mapped[str] = mapped_column(String(32), default=AnalysisStatus.QUEUED.value, nullable=False)
    # Officer-managed lifecycle, distinct from the pipeline `status`.
    workflow_status: Mapped[str] = mapped_column(String(24), default="DRAFT", nullable=False)
    stage_error: Mapped[str | None] = mapped_column(Text)
    options_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    # Derived product/domain profile (Phase 1) + AI decision trace (Phase 8).
    product_profile_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    decision_trace_json: Mapped[list[Any]] = mapped_column(JSON, default=list)
    languages_json: Mapped[list[Any]] = mapped_column(JSON, default=list)
