"""Persist an uploaded document: store bytes, extract pages (+OCR), record model."""

from __future__ import annotations

import hashlib
import uuid

from sqlalchemy.orm import Session

from app.models import Document, DocumentPage
from app.services.ingestion.extract import extract
from app.services.object_store import get_object_store


def ingest_document(db: Session, data: bytes, filename: str, mime_type: str, user_id: str | None) -> Document:
    checksum = hashlib.sha256(data).hexdigest()
    storage_key = f"documents/{uuid.uuid4()}-{filename}"
    get_object_store().put(storage_key, data)

    result = extract(data, mime_type, filename)
    doc = Document(
        uploaded_by=user_id, filename=filename, mime_type=mime_type, byte_size=len(data),
        checksum_sha256=checksum, storage_key=storage_key, page_count=len(result.pages),
        is_scanned=result.is_scanned, data_origin="CURATED",
    )
    db.add(doc)
    db.flush()
    for p in result.pages:
        db.add(DocumentPage(
            document_id=doc.id, page_number=p.page_number, text=p.text, char_count=len(p.text),
            ocr_used=p.ocr_used, ocr_confidence=p.ocr_confidence, layout_json=p.layout,
        ))
    db.commit()
    return doc
