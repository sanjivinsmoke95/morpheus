from pydantic import BaseModel, Field


class StandardCreate(BaseModel):
    is_number: str = Field(min_length=2, max_length=64)
    title: str = Field(min_length=2, max_length=500)
    scope: str = ""
    sector: str = ""
    product_categories: list[str] = []
    materials: list[str] = []
    keywords: list[str] = []
    status: str = "ACTIVE"
    current_version: str = ""
    publication_year: int | None = None
    data_origin: str = "CURATED"          # CURATED | AUTHORITATIVE
    source_url: str = ""
    source_name: str = "admin"
    verification_status: str = "VERIFIED"


class StandardUpdate(BaseModel):
    title: str | None = None
    scope: str | None = None
    sector: str | None = None
    product_categories: list[str] | None = None
    materials: list[str] | None = None
    keywords: list[str] | None = None
    status: str | None = None
    current_version: str | None = None
    source_url: str | None = None
    verification_status: str | None = None


class RelationshipCreate(BaseModel):
    from_is_number: str
    to_is_number: str
    relationship_type: str
    note: str = ""
    relationship_confidence: str = "MEDIUM"
    data_origin: str = "CURATED"
    source_name: str = "admin"


class QcoCreate(BaseModel):
    is_number: str
    qco_status: str
    product_description: str = ""
    order_name: str = ""
    notes: str = ""
    data_origin: str = "CURATED"
    source_name: str = "admin"


class CertificationCreate(BaseModel):
    is_number: str
    scheme: str
    product_description: str = ""
    requirement: str = ""
    data_origin: str = "CURATED"
    source_name: str = "admin"
