"""Generate a realistic English tender PDF for testing (DEMO / SYNTHETIC).

Distribution-transformer procurement — exercises product classification, parameter
normalization, electrical-sector retrieval, QCO/cert and conflict detection.
Run: ./.venv/bin/python scripts/make_test_tender.py
"""
from __future__ import annotations
import io, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

OUT = Path(__file__).resolve().parent.parent / "storage" / "demo_tender_transformer.pdf"

TEXT = """\
CENTRAL POWER DISTRIBUTION UTILITY (DEMO — SYNTHETIC)
TENDER No. CPDU/ENGG/DT/2026-27/17

TENDER FOR SUPPLY OF 100 kVA, 11 kV THREE-PHASE OIL-IMMERSED
DISTRIBUTION TRANSFORMERS

1. SCOPE
Supply of 250 numbers of 100 kVA, 11 kV / 433 V three-phase, oil-immersed,
outdoor type distribution transformers, conforming to applicable Indian Standards.

2. TECHNICAL SPECIFICATIONS

2.1 RATING & GENERAL
 (a) Rated capacity: 100 kVA.
 (b) Rated primary voltage: 11 kV; secondary voltage: 433 V.
 (c) Number of phases: three phase.
 (d) Frequency: 50 Hz.
 (e) Type: oil immersed, outdoor installation.
 (f) Vector group: Dyn11.
 (g) Cooling: ONAN.

2.2 LOSSES & EFFICIENCY
 (a) Maximum no-load loss: 260 W.
 (b) Maximum load loss at 75 degC: 1760 W.
 (c) Minimum efficiency at 50% load: 98.5 percent.

2.3 INSULATION & TESTING
 (a) The transformer shall withstand a power-frequency test of 28 kV for 60 seconds.
 (b) Temperature rise of oil shall not exceed 50 degC; winding not more than 55 degC.
 (c) Routine, type and special tests shall be conducted as per the applicable IS.
 (d) The bidder shall submit test certificates from a NABL-accredited laboratory.

2.4 MATERIALS
 (a) Core: cold rolled grain oriented (CRGO) silicon steel.
 (b) Windings: electrolytic grade copper conductor.
 (c) Tank: mild steel, hot-dip galvanised, minimum thickness 3.15 mm.
 (d) Transformer oil shall conform to the applicable insulating-oil standard.

2.5 FITTINGS
 (a) Off-circuit tap changer with range +5% to -10% in steps of 2.5%.
 (b) Bushings rated 12 kV on HV side and 1.1 kV on LV side.
 (c) Marshalling and earthing terminals as per applicable code of practice.

3. ENVIRONMENTAL CONDITIONS
 (a) Ambient temperature: -5 degC to 50 degC.
 (b) Maximum relative humidity: 100 percent.
 (c) Altitude: up to 1000 m above mean sea level.

4. QUALITY & CERTIFICATION
 (a) The transformer shall carry BIS certification / ISI marking where mandated.
 (b) Energy-efficiency level shall meet the applicable BEE star-labelling requirement.

5. WARRANTY
 (a) 60 months from the date of commissioning against manufacturing defects.

6. MAKE IN INDIA
Preference to local suppliers shall apply under the Public Procurement (Preference
to Make in India) Order. Bidders shall declare local content with self-certification.

7. DELIVERY
Complete supply within 150 days of the purchase order.

--- DEMO / SYNTHETIC tender for MORPHEUS testing. Not a real procurement notice. ---
"""


def build() -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm, title="Distribution Transformer Tender (DEMO)")
    body = ParagraphStyle("b", parent=getSampleStyleSheet()["Normal"], fontSize=9.5, leading=13)
    story = []
    for block in TEXT.split("\n\n"):
        story.append(Paragraph(block.replace("\n", "<br/>"), body))
        story.append(Spacer(1, 6))
    doc.build(story)
    return buf.getvalue()


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(build())
    print("wrote", OUT)
