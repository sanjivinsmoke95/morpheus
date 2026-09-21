"""Evaluation dataset + results (Phase 7). Metrics are ONLY ever written by the
harness against the labelled gold set — there is no hand-entered-metric path."""

from typing import Any

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DataOrigin


class EvaluationCase(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_cases"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    sector: Mapped[str] = mapped_column(String(48), default="")
    procurement_text: Mapped[str] = mapped_column(Text, nullable=False)
    gold_standards: Mapped[list[Any]] = mapped_column(JSON, default=list)       # list[is_number]
    gold_applicability: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)  # is_number -> class
    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)


class EvaluationResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_results"

    evaluation_case_id: Mapped[str] = mapped_column(
        ForeignKey("evaluation_cases.id", ondelete="CASCADE"), index=True, nullable=False)
    run_label: Mapped[str] = mapped_column(String(48), default="")
    method: Mapped[str] = mapped_column(String(16), nullable=False)  # keyword|vector|hybrid|morpheus
    precision_at_k: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    recall_at_k: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    mrr: Mapped[float] = mapped_column(Float, default=0.0)
    applicability_f1: Mapped[float | None] = mapped_column(Float)
    evidence_precision: Mapped[float | None] = mapped_column(Float)
    abstention_rate: Mapped[float | None] = mapped_column(Float)
