"""Document upload + retrieval. Validates type/size BEFORE processing."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db import get_db
from app.models import Document, DocumentPage, User
from app.schemas.slice import DocumentRead
from app.services.ingestion.service import ingest_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    if file.content_type not in settings.allowed_upload_type_list:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            f"Unsupported type '{file.content_type}'. Allowed: PDF, DOCX, TXT.")
    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            f"File exceeds {settings.max_upload_mb} MB limit.")
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Empty file.")
    try:
        return ingest_document(db, data, file.filename or "upload", file.content_type, user.id)
    except Exception as exc:  # noqa: BLE001 — a corrupt/unreadable file is a 422, not a 500
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Could not read the document — it may be corrupt or password-protected.") from exc


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Document:
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return doc


@router.get("/{document_id}/pages")
def get_pages(document_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    pages = db.execute(
        select(DocumentPage).where(DocumentPage.document_id == document_id).order_by(DocumentPage.page_number)
    ).scalars().all()
    return [{"page_number": p.page_number, "char_count": p.char_count, "ocr_used": p.ocr_used,
             "ocr_confidence": p.ocr_confidence} for p in pages]
