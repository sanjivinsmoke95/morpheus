"""Tender-ready specification clause generator (GeM / CPPP format).

Synthesizes an auditable, standardized, and legally compliant Technical
Specification clause ready for inclusion in GeM bids or CPPP tender schedules.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Analysis, Document, QcoRecord, Recommendation, Requirement, RequirementAttribute, Standard,
)


def generate_tender_clause(db: Session, analysis_id: str) -> dict:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        return {"available": False, "error": "Analysis not found"}

    doc = db.get(Document, analysis.document_id)
    title = analysis.title or (doc.filename if doc else "Procurement Specification")

    recs = db.execute(
        select(Recommendation)
        .where(Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)  # noqa: E712
        .order_by(Recommendation.is_primary.desc(), Recommendation.relevance_score.desc())
    ).scalars().all()

    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}

    primary_std: Standard | None = None
    testing_stds: list[Standard] = []
    material_stds: list[Standard] = []
    safety_stds: list[Standard] = []
    normative_stds: list[Standard] = []

    seen_std_ids = set()
    for r in recs:
        s = std_by_id.get(r.standard_id)
        if not s or s.id in seen_std_ids:
            continue
        seen_std_ids.add(s.id)

        if r.is_primary and not primary_std:
            primary_std = s
        elif r.applicability_class == "TESTING":
            testing_stds.append(s)
        elif r.applicability_class == "MATERIAL":
            material_stds.append(s)
        elif r.applicability_class == "SAFETY":
            safety_stds.append(s)
        elif r.applicability_class in ("NORMATIVE_REFERENCE", "DIRECTLY_APPLICABLE"):
            normative_stds.append(s)

    if not primary_std and normative_stds:
        primary_std = normative_stds.pop(0)

    reqs = db.execute(
        select(Requirement).where(Requirement.analysis_id == analysis_id).order_by(Requirement.req_code)
    ).scalars().all()

    key_params: list[str] = []
    for req in reqs:
        attrs = db.execute(
            select(RequirementAttribute).where(RequirementAttribute.requirement_id == req.id)
        ).scalars().all()
        for a in attrs:
            if a.raw_value:
                key_params.append(f"{a.key.replace('_', ' ').capitalize()}: {a.comparator} {a.raw_value} {a.unit}".strip())

    qco_records = db.execute(
        select(QcoRecord).where(QcoRecord.standard_id.in_(list(seen_std_ids)))
    ).scalars().all()
    mandatory_qco = [q for q in qco_records if q.qco_status == "MANDATORY"]

    lines = []
    lines.append(f"TECHNICAL SPECIFICATION & STANDARDS COMPLIANCE SCHEDULE")
    lines.append(f"Item / Package: {title}")
    lines.append("=" * 60)
    lines.append("")

    lines.append("1. SCOPE & GOVERNING INDIAN STANDARDS")
    if primary_std:
        lines.append(
            f"The item shall conform in all respects to Indian Standard {primary_std.is_number} "
            f"(\"{primary_std.title}\") including all published amendments up to date. "
            f"Where specific provisions are not covered, relevant Indian Standards as listed below shall apply."
        )
    else:
        lines.append(
            "The equipment/material shall conform to relevant Indian Standards (IS) published by "
            "the Bureau of Indian Standards (BIS) in compliance with GFR 2017 Rule 144(i)."
        )
    lines.append("")

    if key_params:
        lines.append("2. SALIENT TECHNICAL PARAMETERS")
        for p in key_params[:8]:
            lines.append(f"  • {p}")
        lines.append("")

    lines.append("3. SUB-COMPONENTS, MATERIALS & WORKMANSHIP STANDARDS")
    if material_stds:
        mat_text = "; ".join(f"{s.is_number} ({s.title})" for s in material_stds)
        lines.append(f"  • Materials shall strictly conform to: {mat_text}.")
    if normative_stds:
        norm_text = "; ".join(f"{s.is_number} ({s.title})" for s in normative_stds[:4])
        lines.append(f"  • Component standards: {norm_text}.")
    if safety_stds:
        safe_text = "; ".join(f"{s.is_number} ({s.title})" for s in safety_stds[:3])
        lines.append(f"  • Safety & protection requirements: {safe_text}.")
    if not (material_stds or normative_stds or safety_stds):
        lines.append("  • Materials and workmanship shall follow applicable BIS codes of practice.")
    lines.append("")

    lines.append("4. QUALITY ASSURANCE, TESTING & ACCEPTANCE")
    if testing_stds:
        test_text = "; ".join(f"{s.is_number} ({s.title})" for s in testing_stds[:3])
        lines.append(f"  • Testing shall be performed strictly in accordance with {test_text}.")
    lines.append(
        "  • Routine and acceptance test certificates from a NABL-accredited or BIS-approved laboratory "
        "shall be submitted with each consignment. The buyer reserves the right to witness stage inspection."
    )
    lines.append("")

    lines.append("5. STATUTORY QUALITY CONTROL ORDER (QCO) & BIS CERTIFICATION")
    if mandatory_qco:
        q = mandatory_qco[0]
        lines.append(
            f"  • MANDATORY STATUTORY REQUIREMENT: The product is covered under the "
            f"\"{q.order_name or 'Quality Control Order'}\". Suppliers MUST possess a valid BIS license "
            f"bearing the Standard Mark (ISI Mark) / BIS Registration under the BIS Act, 2016 at the time of bid submission."
        )
    else:
        lines.append(
            "  • Product certification / Standard Mark (ISI Mark) under Scheme-I of BIS (Conformity Assessment) "
            "Regulations, 2018 shall be preferred in accordance with GFR 2017 Rule 144(i)."
        )
    lines.append("")

    lines.append("6. FAIR COMPETITION & GFR 2017 COMPLIANCE CLAUSE")
    lines.append(
        "  • In accordance with GFR 2017 Rule 144(i) and Rule 173, all technical requirements are functional "
        "and generic. Wherever any brand name, proprietary trademark, or catalog number appears in the tender "
        "documents, it shall be construed as followed by the words 'OR EQUIVALENT'. Equivalent offerings conforming "
        "to the stated Indian Standards shall be fully eligible for technical qualification."
    )

    full_clause = "\n".join(lines)

    return {
        "available": True,
        "analysis_id": analysis_id,
        "title": title,
        "primary_standard": primary_std.is_number if primary_std else None,
        "primary_title": primary_std.title if primary_std else None,
        "clause_text": full_clause,
        "has_mandatory_qco": bool(mandatory_qco),
        "standards_cited": [std_by_id[sid].is_number for sid in seen_std_ids if sid in std_by_id],
    }
