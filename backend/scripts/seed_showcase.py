"""Seed a realistic, pre-analysed showcase tender so the app demos well on first login.

Generates a solar street-lighting tender PDF (DEMO / SYNTHETIC), ingests it, creates
an analysis, and runs the pipeline synchronously. Idempotent: skips if the showcase
analysis already exists. Run:  ./.venv/bin/python scripts/seed_showcase.py
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import Analysis, Document, User  # noqa: E402
from app.models.enums import AnalysisStatus  # noqa: E402
from app.services.ingestion.service import ingest_document  # noqa: E402
from app.services.orchestrator.pipeline import run_pipeline  # noqa: E402

SHOWCASE_TITLE = "Solar Street Lighting — Municipal Demo"
STORAGE = Path(__file__).resolve().parent.parent / "storage"

TENDER_TEXT = """\
ABC MUNICIPAL CORPORATION  (DEMO — SYNTHETIC)
TENDER NOTICE No. ABC/ENGG/SSL/2026-27/04

TENDER FOR SUPPLY, INSTALLATION, TESTING AND COMMISSIONING OF
SOLAR POWERED LED STREET LIGHTING SYSTEM

1. SCOPE OF WORK
The Corporation invites sealed bids for the supply, installation, testing and
commissioning of 500 numbers of all-in-one / semi-integrated solar powered LED
street lighting systems, each mounted on a 9 metre galvanised steel pole, along
municipal roads. The scope includes the solar module, LED luminaire, battery,
charge controller, pole, foundation, earthing and all associated wiring.

2. TECHNICAL SPECIFICATIONS

2.1 LED LUMINAIRE
 (a) Each luminaire shall be a minimum of 30 W LED type suitable for street lighting.
 (b) Luminous efficacy shall not be less than 130 lumens per watt.
 (c) Correlated colour temperature (CCT) shall be in the range 5000 K to 6500 K.
 (d) Colour rendering index (CRI) shall be not less than 70.
 (e) The luminaire enclosure shall have an ingress protection of at least IP65.
 (f) The luminaire shall comply with the applicable Indian Standard for street
     lighting luminaires and carry BIS registration where mandated.

2.2 SOLAR PV MODULE
 (a) Each system shall have a monocrystalline solar photovoltaic module of not less
     than 80 Wp.
 (b) Module efficiency shall not be less than 18 percent.
 (c) Power degradation shall not exceed 20 percent over 25 years.

2.3 BATTERY
 (a) Each system shall use a Lithium Ferro Phosphate (LiFePO4) battery of 12 V, 60 Ah.
 (b) The battery shall provide autonomy for a minimum of two rainy days.
 (c) Cycle life shall be not less than 2000 cycles at 80 percent depth of discharge.

2.4 SOLAR CHARGE CONTROLLER
 (a) The charge controller shall be MPPT type with an ingress protection of IP54.
 (b) It shall provide over-charge, deep-discharge and reverse-polarity protection.

2.5 STEEL POLE AND FOUNDATION
 (a) The pole shall be a 9 metre hot-dip galvanised tubular steel pole.
 (b) The pole shall withstand a design wind speed of 150 kilometres per hour.
 (c) The pole shall be fabricated from structural steel of grade E250.
 (d) The foundation shall be of cement concrete of grade M20.

2.6 ELECTRICAL SAFETY
 (a) Earthing shall be provided for every pole as per the applicable code of practice.
 (b) Internal wiring shall use PVC insulated copper cables of minimum 1.5 sq mm.
 (c) Each system shall be protected by a miniature circuit breaker of 10 kA capacity.

3. PERFORMANCE REQUIREMENTS
 (a) The average illuminance on the carriageway shall be not less than 15 lux.
 (b) The uniformity ratio shall be not less than 0.4.
 (c) The system shall operate for a minimum of 11 hours per night.

4. TESTING AND INSPECTION
The Corporation reserves the right to inspect and test the materials. The bidder
shall submit test certificates for the luminaire, PV module and battery from a
NABL-accredited laboratory. LED products shall carry valid BIS registration.

5. WARRANTY
 (a) Luminaire and pole: five years.
 (b) Battery: two years.

6. MAKE IN INDIA
Preference shall be given to local suppliers in accordance with the Public
Procurement (Preference to Make in India) Order. Bidders shall declare local content.

7. DELIVERY AND COMPLETION
Supply, installation and commissioning shall be completed within 120 days of the
work order.

--- This is a DEMO / SYNTHETIC tender for demonstration only. It is not a real
government procurement notice. ---
"""


def _build_pdf(text: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm, title="Solar Street Lighting Tender (DEMO)")
    styles = getSampleStyleSheet()
    body = ParagraphStyle("b", parent=styles["Normal"], fontSize=9.5, leading=13)
    story = []
    for block in text.split("\n\n"):
        story.append(Paragraph(block.replace("\n", "<br/>"), body))
        story.append(Spacer(1, 6))
    doc.build(story)
    return buf.getvalue()


def main() -> None:
    db = SessionLocal()
    existing = db.execute(select(Analysis).where(Analysis.title == SHOWCASE_TITLE)).scalar_one_or_none()
    if existing:
        print(f"Showcase already present ({existing.id}, status={existing.status}).")
        return

    officer = db.execute(select(User).where(User.email == "officer@morpheus.example.com")).scalar_one_or_none()
    officer = officer or db.execute(select(User)).scalars().first()

    pdf = _build_pdf(TENDER_TEXT)
    STORAGE.mkdir(parents=True, exist_ok=True)
    (STORAGE / "demo_tender_solar_streetlight.pdf").write_bytes(pdf)

    doc = ingest_document(db, pdf, "solar_street_lighting_tender_DEMO.pdf", "application/pdf",
                          officer.id if officer else None)
    analysis = Analysis(document_id=doc.id, created_by=officer.id if officer else None,
                        title=SHOWCASE_TITLE, sector="electrical", status=AnalysisStatus.QUEUED.value)
    db.add(analysis)
    db.commit()
    aid = analysis.id
    print(f"Ingested doc {doc.id} ({doc.page_count} pages); running pipeline for {aid} …")
    run_pipeline(aid)

    a = db.get(Analysis, aid)
    print(f"Done. Analysis {aid} status={a.status}.")


if __name__ == "__main__":
    main()
