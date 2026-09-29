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

    profile = analysis.product_profile_json or {}
    primary_cat = (profile.get("product_category") or "").lower()
    analysis_sector = (analysis.sector or profile.get("sector") or "").lower()
    title_low = title.lower()

    # Prioritize standards that match the main product category / tender title
    candidates_primary: list[tuple[int, Standard]] = []
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

        # Match score for primary standard:
        p_score = 0
        s_title_low = (s.title or "").lower()
        cats = [c.lower() for c in (s.product_categories or [])]
        if any(cat in primary_cat or cat in title_low for cat in cats):
            p_score += 4
        if any(w in s_title_low for w in primary_cat.split() if len(w) > 3):
            p_score += 3
        if r.is_primary:
            p_score += 2
        if r.applicability_class in ("DIRECTLY_APPLICABLE", "NORMATIVE_REFERENCE"):
            p_score += 1
        candidates_primary.append((p_score, s))

        # Filter out cross-sector mismatch for auxiliary standards (e.g. pump tests in electrical tender)
        if analysis_sector and s.sector and s.sector != analysis_sector and r.relevance_score < 0.4:
            continue

        if r.applicability_class == "TESTING":
            testing_stds.append(s)
        elif r.applicability_class == "MATERIAL":
            material_stds.append(s)
        elif r.applicability_class == "SAFETY":
            safety_stds.append(s)
        elif r.applicability_class in ("NORMATIVE_REFERENCE", "DIRECTLY_APPLICABLE"):
            normative_stds.append(s)

    candidates_primary.sort(key=lambda x: x[0], reverse=True)
    primary_std: Standard | None = candidates_primary[0][1] if candidates_primary and candidates_primary[0][0] > 0 else None

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
        # Short context from requirement description (first 4 words)
        words = req.description.split()[:4]
        ctx = " ".join(words).rstrip(":")
        for a in attrs:
            if a.raw_value:
                key_params.append(f"{ctx} — {a.key.replace('_', ' ').capitalize()}: {a.comparator} {a.raw_value} {a.unit}".strip())

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

    full_clause_en = "\n".join(lines)

    # ── Hindi Synthesized Clause (द्विभाषी निविदा विनिर्देश) ──
    lines_hi = []
    lines_hi.append("तकनीकी विनिर्देश एवं मानक अनुपालन अनुसूची (Technical Specification & Standards Compliance Schedule)")
    lines_hi.append(f"सामग्री / पैकेज (Item / Package): {title}")
    lines_hi.append("=" * 60)
    lines_hi.append("")

    lines_hi.append("1. कार्यक्षेत्र एवं मुख्य भारतीय मानक (SCOPE & GOVERNING INDIAN STANDARDS)")
    if primary_std:
        lines_hi.append(
            f"आपूर्ति की जाने वाली सामग्री सभी पहलुओं में भारतीय मानक {primary_std.is_number} "
            f"(\"{primary_std.title}\") और इसके अद्यतन संशोधनों के पूर्णतः अनुरूप होगी। "
            f"जहां विशिष्ट तकनीकी प्रावधान शामिल नहीं हैं, वहां नीचे सूचीबद्ध सुसंगत भारतीय मानक लागू होंगे।"
        )
    else:
        lines_hi.append(
            "सामग्री/उपकरण सामान्य वित्तीय नियम (GFR) 2017 के नियम 144(i) के अनुपालन में "
            "भारतीय मानक ब्यूरो (BIS) द्वारा प्रकाशित सुसंगत भारतीय मानकों (IS) के अनुरूप होना अनिवार्य है।"
        )
    lines_hi.append("")

    if key_params:
        lines_hi.append("2. मुख्य तकनीकी मानदंड (SALIENT TECHNICAL PARAMETERS)")
        for p in key_params[:8]:
            lines_hi.append(f"  • {p}")
        lines_hi.append("")

    lines_hi.append("3. उप-घटक, सामग्री एवं कारीगरी मानक (SUB-COMPONENTS, MATERIALS & WORKMANSHIP STANDARDS)")
    if material_stds:
        mat_text = "; ".join(f"{s.is_number} ({s.title})" for s in material_stds)
        lines_hi.append(f"  • प्रयुक्त सामग्री कड़ाई से निम्नलिखित मानकों के अनुरूप होगी: {mat_text}।")
    if normative_stds:
        norm_text = "; ".join(f"{s.is_number} ({s.title})" for s in normative_stds[:4])
        lines_hi.append(f"  • घटक मानक (Component standards): {norm_text}।")
    if safety_stds:
        safe_text = "; ".join(f"{s.is_number} ({s.title})" for s in safety_stds[:3])
        lines_hi.append(f"  • सुरक्षा एवं संरक्षण आवश्यकताएं: {safe_text}।")
    if not (material_stds or normative_stds or safety_stds):
        lines_hi.append("  • सामग्री एवं निर्माण कार्यप्रणाली लागू बीआईएस आचार संहिताओं (Codes of Practice) के अनुरूप होगी।")
    lines_hi.append("")

    lines_hi.append("4. गुणवत्ता आश्वासन, परीक्षण एवं स्वीकृति (QUALITY ASSURANCE, TESTING & ACCEPTANCE)")
    if testing_stds:
        test_text = "; ".join(f"{s.is_number} ({s.title})" for s in testing_stds[:3])
        lines_hi.append(f"  • परीक्षण कड़ाई से निम्नलिखित मानकों के अनुसार संपन्न किया जाएगा: {test_text}।")
    lines_hi.append(
        "  • प्रत्येक खेप के साथ एनएबीएल (NABL) से मान्यता प्राप्त अथवा बीआईएस द्वारा अनुमोदित प्रयोगशाला से "
        "जारी नियमित (Routine) एवं स्वीकृति (Acceptance) परीक्षण प्रमाणपत्र प्रस्तुत करना अनिवार्य होगा। "
        "क्रेता के पास निर्माण स्थल पर चरणबद्ध निरीक्षण (Stage Inspection) का अधिकार सुरक्षित रहेगा।"
    )
    lines_hi.append("")

    lines_hi.append("5. सांविधिक गुणवत्ता नियंत्रण आदेश (QCO) एवं बीआईएस प्रमाणन (STATUTORY QCO & BIS CERTIFICATION)")
    if mandatory_qco:
        q = mandatory_qco[0]
        lines_hi.append(
            f"  • अनिवार्य सांविधिक आवश्यकता: यह उत्पाद भारत सरकार के \"{q.order_name or 'गुणवत्ता नियंत्रण आदेश'}\" के अंतर्गत आता है। "
            f"बोली जमा करते समय आपूर्तिकर्ता के पास बीआईएस अधिनियम, 2016 के तहत वैध मानक चिह्न (ISI मार्क) / बीआईएस पंजीकरण होना अनिवार्य है।"
        )
    else:
        lines_hi.append(
            "  • जीएफआर (GFR) 2017 के नियम 144(i) के अनुसार बीआईएस (अनुरूपता मूल्यांकन) विनियम, 2018 की योजना-I "
            "के तहत उत्पाद प्रमाणन / मानक चिह्न (ISI मार्क) धारक निर्माताओं को प्राथमिकता दी जाएगी।"
        )
    lines_hi.append("")

    lines_hi.append("6. निष्पक्ष प्रतिस्पर्धा एवं जीएफआर 2017 अनुपालन खंड (FAIR COMPETITION & GFR 2017 CLAUSE)")
    lines_hi.append(
        "  • जीएफआर 2017 के नियम 144(i) एवं नियम 173 के अनुपालन में, सभी तकनीकी आवश्यकताएं कार्यात्मक एवं सामान्य हैं। "
        "निविदा दस्तावेजों में जहां कहीं भी किसी ब्रांड का नाम, ट्रेडमार्क अथवा कैटलॉग नंबर उल्लिखित है, "
        "उसे 'अथवा समकक्ष' (OR EQUIVALENT) के रूप में पढ़ा जाएगा। उल्लिखित भारतीय मानकों के अनुरूप समकक्ष उत्पाद "
        "तकनीकी योग्यता हेतु पूर्णतः पात्र माने जाएंगे।"
    )

    full_clause_hi = "\n".join(lines_hi)

    return {
        "available": True,
        "analysis_id": analysis_id,
        "title": title,
        "primary_standard": primary_std.is_number if primary_std else None,
        "primary_title": primary_std.title if primary_std else None,
        "clause_text": full_clause_en,
        "clause_text_en": full_clause_en,
        "clause_text_hi": full_clause_hi,
        "bilingual_available": True,
        "has_mandatory_qco": bool(mandatory_qco),
        "standards_cited": [std_by_id[sid].is_number for sid in seen_std_ids if sid in std_by_id],
    }
