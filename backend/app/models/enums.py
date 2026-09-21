"""Canonical vocabulary (architecture.md §2), as string enums.

Stored as plain strings in the DB (portable), validated in the Pydantic layer.
This module is the single source of truth shared across models, schemas, and
services; the TypeScript unions are generated from the OpenAPI schema.
"""

from enum import Enum


class StrEnum(str, Enum):
    def __str__(self) -> str:  # so f-strings/JSON emit the value, not "Role.ADMIN"
        return self.value


class Role(StrEnum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    REVIEWER = "REVIEWER"


class ApplicabilityClass(StrEnum):
    DIRECTLY_APPLICABLE = "DIRECTLY_APPLICABLE"
    NORMATIVE_REFERENCE = "NORMATIVE_REFERENCE"
    TESTING = "TESTING"
    SAFETY = "SAFETY"
    MATERIAL = "MATERIAL"
    INSTALLATION = "INSTALLATION"
    CERTIFICATION = "CERTIFICATION"
    CONDITIONAL = "CONDITIONAL"
    RELATED = "RELATED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class CoverageClass(StrEnum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    MISSING = "MISSING"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class Confidence(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"  # abstain


class Relevance(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RelationshipType(StrEnum):
    REFERENCES = "REFERENCES"
    NORMATIVE_REFERENCE = "NORMATIVE_REFERENCE"
    TESTING = "TESTING"
    SAFETY = "SAFETY"
    MATERIAL = "MATERIAL"
    INSTALLATION = "INSTALLATION"
    CERTIFICATION = "CERTIFICATION"
    AMENDS = "AMENDS"
    SUPERSEDES = "SUPERSEDES"
    SUPERSEDED_BY = "SUPERSEDED_BY"
    RELATED_TO = "RELATED_TO"


class RequirementType(StrEnum):
    PRODUCT = "PRODUCT"
    PARAMETER = "PARAMETER"
    DIMENSION = "DIMENSION"
    MATERIAL = "MATERIAL"
    PERFORMANCE = "PERFORMANCE"
    SAFETY = "SAFETY"
    TESTING = "TESTING"
    CERTIFICATION = "CERTIFICATION"
    INSTALLATION = "INSTALLATION"
    REFERENCED_STANDARD = "REFERENCED_STANDARD"


class ReviewDecision(StrEnum):
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    MARK_FOR_REVIEW = "MARK_FOR_REVIEW"
    EDIT = "EDIT"
    ADD_STANDARD = "ADD_STANDARD"
    ADD_COMMENT = "ADD_COMMENT"
    OVERRIDE = "OVERRIDE"


class VerificationStatus(StrEnum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    DISPUTED = "DISPUTED"


class QcoStatus(StrEnum):
    MANDATORY = "MANDATORY"
    CONDITIONAL = "CONDITIONAL"
    VOLUNTARY = "VOLUNTARY"
    UNKNOWN = "UNKNOWN"


class DataOrigin(StrEnum):
    AUTHORITATIVE = "AUTHORITATIVE"
    CURATED = "CURATED"
    DEMO_SYNTHETIC = "DEMO_SYNTHETIC"


class AnalysisStatus(StrEnum):
    QUEUED = "QUEUED"
    EXTRACTING = "EXTRACTING"
    OCR = "OCR"
    EXTRACTING_REQUIREMENTS = "EXTRACTING_REQUIREMENTS"
    RETRIEVING = "RETRIEVING"
    RANKING = "RANKING"
    CLASSIFYING = "CLASSIFYING"
    AUDITING = "AUDITING"
    READY = "READY"
    FAILED = "FAILED"
