"""Extracted, normalized tender requirements + their typed attributes."""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import Confidence, RequirementType


class Requirement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "requirements"

    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    req_code: Mapped[str] = mapped_column(String(24), nullable=False)  # "R-007"
    requirement_type: Mapped[str] = mapped_column(String(32), default=RequirementType.PARAMETER.value)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_page: Mapped[int | None] = mapped_column(Integer)
    source_section: Mapped[str] = mapped_column(String(64), default="")
    confidence: Mapped[str] = mapped_column(String(16), default=Confidence.MEDIUM.value)
    extraction_method: Mapped[str] = mapped_column(String(16), default="rule")  # rule|llm|manual|edited
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)


class RequirementNote(Base, UUIDMixin, TimestampMixin):
    """An officer's free-text note on a requirement (review context, not evidence)."""

    __tablename__ = "requirement_notes"

    requirement_id: Mapped[str] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), index=True, nullable=False
    )
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    body: Mapped[str] = mapped_column(Text, nullable=False)


class RequirementAttribute(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "requirement_attributes"

    requirement_id: Mapped[str] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)  # 'voltage'
    raw_value: Mapped[str] = mapped_column(String(120), default="")
    normalized_value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(32), default="")
    canonical_unit: Mapped[str] = mapped_column(String(32), default="")
    comparator: Mapped[str] = mapped_column(String(8), default="=")  # >=,<=,=,range
    value_high: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[str] = mapped_column(String(16), default=Confidence.MEDIUM.value)
