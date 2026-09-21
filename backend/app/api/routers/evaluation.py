"""Evaluation API (Phase 7): baseline comparison over the labelled gold set."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import EvaluationCase, User
from app.models.enums import Role
from app.services.evaluation.harness import run_evaluation, seed_eval_cases, summary

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.get("")
def get_summary(
    run_label: str = "default",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
) -> dict:
    return summary(db, run_label)


@router.get("/cases")
def list_cases(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    seed_eval_cases(db)
    cases = db.execute(select(EvaluationCase)).scalars().all()
    return [{"id": c.id, "name": c.name, "sector": c.sector, "gold_standards": c.gold_standards,
             "data_origin": c.data_origin} for c in cases]


@router.post("/run")
def run(
    run_label: str = "default",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
) -> dict:
    rows = run_evaluation(db, run_label)
    return {"status": "complete", "result_rows": rows, "summary": summary(db, run_label)}
