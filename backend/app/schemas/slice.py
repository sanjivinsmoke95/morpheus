"""Typed contracts for the Phase 2 vertical slice."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---- documents ----
class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    mime_type: str
    byte_size: int
    page_count: int
    is_scanned: bool
    created_at: datetime


# ---- analyses ----
class AnalysisCreate(BaseModel):
    document_id: str
    title: str = Field(default="", max_length=300)
    sector: str = Field(default="", max_length=48)


class AnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    document_id: str
    title: str
    sector: str
    status: str
    workflow_status: str = "DRAFT"
    stage_error: str | None
    created_at: datetime
    product_profile_json: dict | None = None
    decision_trace_json: list | None = None
    languages_json: list | None = None


# ---- requirements ----
class RequirementAttributeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    key: str
    raw_value: str
    normalized_value: float | None
    unit: str
    canonical_unit: str
    comparator: str
    value_high: float | None


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    req_code: str
    requirement_type: str
    description: str
    source_page: int | None
    source_section: str
    confidence: str
    extraction_method: str
    is_edited: bool
    attributes: list[RequirementAttributeRead] = []


class RequirementUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=800)
    requirement_type: str | None = None


# ---- evidence + recommendations ----
class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_type: str
    source_name: str
    source_url: str
    page: int | None
    section: str
    text: str
    data_origin: str
    retrieved_at: str


class StandardMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_number: str
    title: str
    sector: str
    status: str
    data_origin: str


class RecommendationRead(BaseModel):
    id: str
    requirement_id: str
    standard: StandardMini
    applicability_class: str
    relevance: str
    relevance_score: float
    retrieval_method: str
    signals: dict[str, Any]
    rationale: str
    confidence: str
    final_rank: int
    is_primary: bool
    review_status: str
    excluded: bool
    exclusion_reason: str
    evidence: list[EvidenceRead] = []
    why: list[dict] = []
    why_not: list[dict] = []


# ---- reviews ----
class ReviewDecisionCreate(BaseModel):
    target_type: str = Field(pattern="^(recommendation|requirement|gap|conflict)$")
    target_id: str
    decision: str
    reason: str = Field(default="", max_length=2000)


class ReviewDecisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    target_type: str
    target_id: str
    decision: str
    reason: str
    created_at: datetime


# ---- reports ----
class ReportCreate(BaseModel):
    analysis_id: str
    format: str = Field(pattern="^(PDF|DOCX)$")


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    analysis_id: str
    format: str
    checksum_sha256: str
    created_at: datetime
