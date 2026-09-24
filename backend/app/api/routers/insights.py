"""Make-in-India / PPP-MII check + on-screen report summary (JSON).

The MII check is a transparent rule scan over the tender text — it flags preference
clauses, foreign-brand specifications and a missing local-content declaration. It is
advisory, not a legal determination. The report summary reuses the curated report
assembly so the screen and the PDF show the same thing.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Analysis, DocumentPage, User
from app.services.reports.generate import _curate, _gather

router = APIRouter(tags=["insights"])

# Foreign brand / origin terms that, when specified in a tender, can undercut MII.
_FOREIGN_HINTS = [
    "imported only", "imported make", "foreign make", "us make", "german make", "japanese make",
    "european make", "make: siemens", "make: abb", "make: schneider", "only imported", "of foreign origin",
]
_PREF_HINTS = ["make in india", "make-in-india", "public procurement", "preference to make",
               "ppp-mii", "class-i local supplier", "local content", "local supplier"]
_DECLARE_HINTS = ["local content", "declare local content", "self-certif", "local content certificate"]


def _tender_text(db: Session, analysis: Analysis) -> str:
    pages = db.execute(select(DocumentPage).where(
        DocumentPage.document_id == analysis.document_id)).scalars().all()
    return "\n".join(p.text for p in pages).lower()


@router.get("/analyses/{analysis_id}/mii")
def make_in_india(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        return {"available": False}
    text = _tender_text(db, analysis)

    has_pref = any(h in text for h in _PREF_HINTS)
    foreign = sorted({h for h in _FOREIGN_HINTS if h in text})
    has_declaration = any(h in text for h in _DECLARE_HINTS)

    issues: list[dict] = []
    if foreign:
        issues.append({
            "severity": "HIGH",
            "text": f"Specification references foreign origin/brand terms ({', '.join(foreign)}). "
                    "This may restrict local suppliers and conflict with PPP-MII.",
        })
    if not has_pref:
        issues.append({
            "severity": "MEDIUM",
            "text": "No Make-in-India / purchase-preference clause found. Add the PPP-MII preference clause "
                    "so Class-I local suppliers get the mandated preference.",
        })
    if not has_declaration:
        issues.append({
            "severity": "MEDIUM",
            "text": "No local-content declaration requirement found. Require bidders to declare local content "
                    "with self-certification.",
        })

    if not issues:
        advisory = "The tender includes a Make-in-India preference and a local-content declaration, with no " \
                   "foreign-brand restrictions detected."
        status = "OK"
    elif foreign or not has_pref:
        advisory = "Review the specification for Make-in-India compliance before issuing the tender."
        status = "ACTION"
    else:
        advisory = "Minor Make-in-India gaps — add the missing clause(s)."
        status = "REVIEW"

    return {
        "available": True,
        "status": status,
        "has_preference_clause": has_pref,
        "has_local_content_declaration": has_declaration,
        "foreign_brand_terms": foreign,
        "issues": issues,
        "advisory": advisory,
    }


@router.get("/analyses/{analysis_id}/gfr")
def gfr(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    """GFR 2017 advisory procurement-review flags (Phase 16)."""
    from app.services.audit.gfr import gfr_review
    return gfr_review(db, analysis_id)


@router.get("/analyses/{analysis_id}/report-summary")
def report_summary(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    """The same curated content the PDF shows, as JSON for the on-screen report."""
    if not db.get(Analysis, analysis_id):
        return {}
    data = _gather(db, analysis_id)
    return _curate(db, analysis_id, data)
