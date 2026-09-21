"""QCO + certification records (Phase 5). Authoritative data only; the app never
invents regulatory status — records are stamped with origin + source + retrieval.
"""

from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DataOrigin, QcoStatus, VerificationStatus


class QcoRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "qco_records"

    standard_id: Mapped[str | None] = mapped_column(ForeignKey("standards.id", ondelete="SET NULL"), index=True)
    product_description: Mapped[str] = mapped_column(String(300), default="")
    qco_status: Mapped[str] = mapped_column(String(16), default=QcoStatus.UNKNOWN.value)
    order_name: Mapped[str] = mapped_column(String(300), default="")
    effective_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="")

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="DEMO")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    verification_status: Mapped[str] = mapped_column(String(16), default=VerificationStatus.UNVERIFIED.value)


class CertificationRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "certification_records"

    standard_id: Mapped[str | None] = mapped_column(ForeignKey("standards.id", ondelete="SET NULL"), index=True)
    scheme: Mapped[str] = mapped_column(String(24), default="")  # ISI | CRS | ...
    product_description: Mapped[str] = mapped_column(String(300), default="")
    requirement: Mapped[str] = mapped_column(Text, default="")
    effective_date: Mapped[date | None] = mapped_column(Date)

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="DEMO")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    verification_status: Mapped[str] = mapped_column(String(16), default=VerificationStatus.UNVERIFIED.value)
