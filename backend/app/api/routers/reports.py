"""Procurement report generation + download (PDF/DOCX)."""

import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Analysis, Report, User
from app.schemas.slice import ReportCreate, ReportRead
from app.services.object_store import get_object_store
from app.services.reports.generate import build_docx, build_pdf

router = APIRouter(prefix="/reports", tags=["reports"])

_MEDIA = {"PDF": "application/pdf",
          "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not db.get(Analysis, payload.analysis_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    data = build_pdf(db, payload.analysis_id) if payload.format == "PDF" else build_docx(db, payload.analysis_id)
    checksum = hashlib.sha256(data).hexdigest()
    key = f"reports/{payload.analysis_id}-{checksum[:12]}.{payload.format.lower()}"
    get_object_store().put(key, data)
    report = Report(analysis_id=payload.analysis_id, format=payload.format, storage_key=key,
                    generated_by=user.id, checksum_sha256=checksum)
    db.add(report)
    db.commit()
    return report


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
    return report


@router.get("/{report_id}/download")
def download(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Response:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
    data = get_object_store().get(report.storage_key)
    filename = f"morpheus-report-{report.analysis_id[:8]}.{report.format.lower()}"
    return Response(content=data, media_type=_MEDIA[report.format],
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
