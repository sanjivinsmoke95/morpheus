"""Knowledge-graph API: analysis subgraph, standard neighbourhood, edge detail."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import User
from app.services.graph import service as graph

router = APIRouter(tags=["graph"])


@router.get("/analyses/{analysis_id}/graph")
def analysis_graph(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    return graph.analysis_graph(db, analysis_id)


@router.get("/graph/standards/{standard_id}")
def standard_neighbourhood(
    standard_id: str,
    depth: int = Query(default=2, ge=1, le=4),
    types: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    type_list = [t.strip() for t in types.split(",")] if types else None
    return graph.neighborhood(db, standard_id, depth=depth, types=type_list)


@router.get("/graph/edges/{edge_id}")
def edge_detail(edge_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    detail = graph.edge_detail(db, edge_id)
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Relationship not found.")
    return detail
