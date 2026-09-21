"""Generated procurement reports (PDF/DOCX)."""

from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Report(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reports"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    format: Mapped[str] = mapped_column(String(8), nullable=False)  # PDF|DOCX
    storage_key: Mapped[str] = mapped_column(String(300), default="")
    generated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    params_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    checksum_sha256: Mapped[str] = mapped_column(String(64), default="")
