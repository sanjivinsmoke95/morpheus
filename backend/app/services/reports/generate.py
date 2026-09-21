"""Procurement report generation (PDF + DOCX) from a persisted analysis.

Deterministic assembly of what the officer verified — requirements, applicable
standards with classification + evidence, and review decisions — plus a demo-data
disclaimer where any record is DEMO_SYNTHETIC. No LLM required.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Analysis, Document, Recommendation, RecommendationEvidence, Evidence, Requirement, ReviewDecision, Review, Standard,
)


def _gather(db: Session, analysis_id: str) -> dict:
    analysis = db.get(Analysis, analysis_id)
    document = db.get(Document, analysis.document_id) if analysis else None
    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis_id)
                      .order_by(Requirement.req_code)).scalars().all()
    recs = db.execute(select(Recommendation).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)  # noqa: E712
        .order_by(Recommendation.requirement_id, Recommendation.final_rank)).scalars().all()
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}
    decisions = {}
    review = db.execute(select(Review).where(Review.analysis_id == analysis_id)).scalar_one_or_none()
    if review:
        for d in db.execute(select(ReviewDecision).where(ReviewDecision.review_id == review.id)).scalars():
            decisions[(d.target_type, d.target_id)] = d
    has_demo = any(std_by_id[r.standard_id].data_origin == "DEMO_SYNTHETIC" for r in recs)
    return {"analysis": analysis, "document": document, "reqs": reqs, "recs": recs,
            "std_by_id": std_by_id, "decisions": decisions, "has_demo": has_demo}


def build_pdf(db: Session, analysis_id: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from reportlab.lib import colors

    data = _gather(db, analysis_id)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title="MORPHEUS Procurement Report")
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("MORPHEUS — Procurement Specification Audit", styles["Title"]))
    story.append(Paragraph(f"Document: {data['document'].filename if data['document'] else '—'}", styles["Normal"]))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    if data["has_demo"]:
        story.append(Paragraph("<b>Note:</b> some standards below are DEMO / SYNTHETIC and not official BIS data.",
                               styles["Italic"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Executive summary", styles["Heading2"]))
    story.append(Paragraph(
        f"{len(data['reqs'])} requirements extracted; "
        f"{len(data['recs'])} applicable-standard recommendations identified for officer review.",
        styles["Normal"]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Extracted requirements", styles["Heading2"]))
    rows = [["ID", "Type", "Description", "Pg", "Conf."]]
    for r in data["reqs"]:
        rows.append([r.req_code, r.requirement_type, (r.description[:70] + "…") if len(r.description) > 70 else r.description,
                     str(r.source_page or "—"), r.confidence])
    story.append(_table(rows, Table, TableStyle, colors))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Applicable standards & evidence", styles["Heading2"]))
    for rec in data["recs"]:
        std = data["std_by_id"][rec.standard_id]
        decision = data["decisions"].get(("recommendation", rec.id))
        verdict = decision.decision if decision else rec.review_status
        story.append(Paragraph(
            f"<b>{std.is_number}</b> — {std.title} "
            f"[{rec.applicability_class}, relevance {rec.relevance}, decision {verdict}]"
            f"{' (DEMO)' if std.data_origin == 'DEMO_SYNTHETIC' else ''}", styles["Normal"]))
        story.append(Paragraph(f"<i>{rec.rationale}</i>", styles["Normal"]))
        for ev in _evidence_for(db, rec.id):
            story.append(Paragraph(f"• Evidence [{ev.source_type}]: {ev.text[:140]}", styles["BodyText"]))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))
    story.append(Paragraph("This report records AI-assisted findings verified by a procurement officer. "
                           "Regulatory status is shown only where authoritative data exists.", styles["Italic"]))
    doc.build(story)
    return buf.getvalue()


def build_docx(db: Session, analysis_id: str) -> bytes:
    import docx

    data = _gather(db, analysis_id)
    d = docx.Document()
    d.add_heading("MORPHEUS — Procurement Specification Audit", level=0)
    d.add_paragraph(f"Document: {data['document'].filename if data['document'] else '—'}")
    d.add_paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    if data["has_demo"]:
        d.add_paragraph("Note: some standards below are DEMO / SYNTHETIC and not official BIS data.")

    d.add_heading("Executive summary", level=1)
    d.add_paragraph(f"{len(data['reqs'])} requirements extracted; {len(data['recs'])} applicable-standard "
                    "recommendations identified for officer review.")

    d.add_heading("Extracted requirements", level=1)
    t = d.add_table(rows=1, cols=5)
    hdr = t.rows[0].cells
    for i, h in enumerate(["ID", "Type", "Description", "Page", "Confidence"]):
        hdr[i].text = h
    for r in data["reqs"]:
        c = t.add_row().cells
        c[0].text, c[1].text, c[2].text = r.req_code, r.requirement_type, r.description[:120]
        c[3].text, c[4].text = str(r.source_page or "—"), r.confidence

    d.add_heading("Applicable standards & evidence", level=1)
    for rec in data["recs"]:
        std = data["std_by_id"][rec.standard_id]
        decision = data["decisions"].get(("recommendation", rec.id))
        verdict = decision.decision if decision else rec.review_status
        d.add_paragraph(
            f"{std.is_number} — {std.title} [{rec.applicability_class}, relevance {rec.relevance}, decision {verdict}]"
            f"{' (DEMO)' if std.data_origin == 'DEMO_SYNTHETIC' else ''}", style="List Bullet")
        d.add_paragraph(rec.rationale)
        for ev in _evidence_for(db, rec.id):
            d.add_paragraph(f"Evidence [{ev.source_type}]: {ev.text[:160]}", style="List Bullet 2")

    out = io.BytesIO()
    d.save(out)
    return out.getvalue()


def _evidence_for(db: Session, recommendation_id: str):
    ids = [re.evidence_id for re in db.execute(
        select(RecommendationEvidence).where(RecommendationEvidence.recommendation_id == recommendation_id)).scalars()]
    if not ids:
        return []
    return list(db.execute(select(Evidence).where(Evidence.id.in_(ids))).scalars())


def _table(rows, Table, TableStyle, colors):
    t = Table(rows, repeatRows=1, colWidths=[45, 90, 250, 30, 45])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b3d2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t
