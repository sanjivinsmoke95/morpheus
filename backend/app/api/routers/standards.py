"""Standards: search + full details (metadata, versions, amendments, relationships)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Standard, User
from app.services.graph import service as graph

router = APIRouter(prefix="/standards", tags=["standards"])


@router.get("")
def search_standards(
    q: str | None = None,
    sector: str | None = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Standard)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(Standard.title.ilike(like), Standard.is_number.ilike(like),
                              Standard.scope.ilike(like)))
    if sector:
        stmt = stmt.where(Standard.sector == sector)
    rows = db.execute(stmt.limit(limit)).scalars().all()
    return [{"id": s.id, "is_number": s.is_number, "title": s.title, "sector": s.sector,
             "status": s.status, "data_origin": s.data_origin} for s in rows]


@router.get("/{standard_id}")
def standard_details(standard_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    std = db.get(Standard, standard_id)
    if not std:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Standard not found.")
    return graph.standard_details(db, std.is_number)
