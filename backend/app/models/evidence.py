"""Evidence — first-class, grounds every important finding (evidence-model.md)."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DataOrigin


class Evidence(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evidence"

    source_type: Mapped[str] = mapped_column(String(48), nullable=False)
    # tender_document | standard_record | standard_relationship | qco_record | ...
    source_name: Mapped[str] = mapped_column(String(160), default="")
    source_url: Mapped[str] = mapped_column(String(500), default="")
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"))
    page: Mapped[int | None] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(64), default="")
    text: Mapped[str] = mapped_column(Text, default="")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    checksum_sha256: Mapped[str] = mapped_column(String(64), default="")
    relationship_type: Mapped[str] = mapped_column(String(32), default="")
    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
