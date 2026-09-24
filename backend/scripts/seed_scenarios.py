"""Seed polished demo scenarios (mission: demo scenarios).

Idempotent. Adds distinct scenarios that each demonstrate a MORPHEUS capability:
  - Hindi / mixed-language motor tender  → multilingual extraction
  - (the transformer + solar tenders are seeded elsewhere)

Run: ./.venv/bin/python scripts/seed_scenarios.py
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import Analysis, User  # noqa: E402
from app.models.enums import AnalysisStatus  # noqa: E402
from app.services.ingestion.service import ingest_document  # noqa: E402
from app.services.orchestrator.pipeline import run_analysis  # noqa: E402

STORAGE = Path(__file__).resolve().parent.parent / "storage"

# Mixed Hindi + English procurement specification (DEMO / SYNTHETIC).
HINDI_TENDER = """\
जल शक्ति विभाग (DEMO — SYNTHETIC)
निविदा संख्या JSD/PUMP/2026-27/09

तीन चरण इंडक्शन मोटर तथा सेंट्रीफ्यूगल पंप की आपूर्ति हेतु निविदा
TENDER FOR SUPPLY OF THREE-PHASE INDUCTION MOTOR AND CENTRIFUGAL PUMP

1. कार्य क्षेत्र (SCOPE)
जल आपूर्ति योजना हेतु 50 सेट पंप एवं मोटर की आपूर्ति।

2. तकनीकी विनिर्देश (TECHNICAL SPECIFICATIONS)

2.1 मोटर (MOTOR)
 (क) मोटर तीन चरण इंडक्शन प्रकार की होनी चाहिए।
 (ख) मोटर का वोल्टेज 415 वोल्ट होना चाहिए।
 (ग) शक्ति 15 किलोवाट (kW) होनी चाहिए।
 (घ) आवृत्ति 50 हर्ट्ज़।
 (ङ) दक्षता न्यूनतम 90 प्रतिशत।
 (च) The motor shall be suitable for outdoor installation.

2.2 पंप (PUMP)
 (क) सेंट्रीफ्यूगल पंप, clear cold water हेतु।
 (ख) The pump material shall be cast iron.
 (ग) परीक्षण (test) प्रासंगिक भारतीय मानक के अनुसार किया जाएगा।

3. प्रमाणन (CERTIFICATION)
मोटर पर BIS certification / ISI mark होना चाहिए जहाँ अनिवार्य हो।

4. वारंटी: 18 माह।

--- DEMO / SYNTHETIC bilingual tender for MORPHEUS multilingual testing. ---
"""

SCENARIOS = [
    {"title": "Hindi Motor & Pump — Multilingual Demo", "sector": "electrical",
     "filename": "hindi_motor_pump_tender_DEMO.txt", "text": HINDI_TENDER, "mime": "text/plain"},
]


def main() -> None:
    db = SessionLocal()
    officer = db.execute(select(User).where(User.email == "officer@morpheus.example.com")).scalar_one_or_none()
    officer = officer or db.execute(select(User)).scalars().first()
    for sc in SCENARIOS:
        if db.execute(select(Analysis).where(Analysis.title == sc["title"])).scalar_one_or_none():
            print(f"exists: {sc['title']}")
            continue
        data = sc["text"].encode("utf-8")
        (STORAGE / sc["filename"]).write_bytes(data)
        doc = ingest_document(db, data, sc["filename"], sc["mime"], officer.id if officer else None)
        a = Analysis(document_id=doc.id, created_by=officer.id if officer else None,
                     title=sc["title"], sector=sc["sector"], status=AnalysisStatus.QUEUED.value)
        db.add(a)
        db.commit()
        run_analysis(db, a)
        db.refresh(a)
        langs = {l["language"] for l in (a.languages_json or [])}
        print(f"seeded: {sc['title']} → status={a.status} languages={langs} "
              f"product={a.product_profile_json.get('product_category') if a.product_profile_json else '-'}")


if __name__ == "__main__":
    main()
