"""Indian Standard records + embeddable chunks.

Embeddings are stored as JSON float arrays for portability (SQLite dev/test and
Postgres). Production swaps `standard_chunks.embedding` to a pgvector column with
an HNSW index; the retrieval interface is unchanged (search-ranking.md).
"""

from typing import Any

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DataOrigin, VerificationStatus


class Standard(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "standards"

    is_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_number_normalized: Mapped[str] = mapped_column(String(48), index=True, default="")
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    scope: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    sector: Mapped[str] = mapped_column(String(48), default="")
    product_categories: Mapped[list[Any]] = mapped_column(JSON, default=list)
    materials: Mapped[list[Any]] = mapped_column(JSON, default=list)
    keywords: Mapped[list[Any]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE")  # ACTIVE|WITHDRAWN|SUPERSEDED|DRAFT
    publication_year: Mapped[int | None] = mapped_column(Integer)
    revision_year: Mapped[int | None] = mapped_column(Integer)
    current_version: Mapped[str] = mapped_column(String(48), default="")
    hs_codes: Mapped[list[Any]] = mapped_column(JSON, default=list)

    data_origin: Mapped[str] = mapped_column(String(16), default=DataOrigin.DEMO_SYNTHETIC.value)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    source_name: Mapped[str] = mapped_column(String(120), default="")
    retrieved_at: Mapped[str] = mapped_column(String(32), default="")
    verification_status: Mapped[str] = mapped_column(String(16), default=VerificationStatus.UNVERIFIED.value)


class StandardChunk(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "standard_chunks"

    standard_id: Mapped[str] = mapped_column(ForeignKey("standards.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(24), default="title_scope")  # title_scope|metadata|excerpt
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[Any]] = mapped_column(JSON, default=list)  # list[float]
    embedding_model: Mapped[str] = mapped_column(String(48), default="")
