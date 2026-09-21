"""End-to-end vertical slice: upload → extract → requirements → retrieve → rank →
evidence → recommendations → edit (re-analysis) → review → report.

Nothing is hard-coded: requirements come from the tender text, recommendations
from retrieval over the seeded demo standards, evidence from real rows.
"""

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

TENDER = b"""SPECIFICATION FOR WATER PUMP SET

3.1 The pump shall have a minimum operating pressure of 10 bar.
3.2 The motor shall be rated for 415 V, 50 Hz three-phase supply.
3.3 The pump body shall be made of cast iron.
3.4 All pumps shall be tested for performance as per IS 1520 : 2007.
3.5 The equipment shall carry the ISI mark and BIS certification.
3.6 Nominal delivery pipe diameter shall be 100 mm.
"""


def _seed_and_run(client, db_sessionmaker, headers, sector="mechanical"):
    db = db_sessionmaker()
    seed_demo_standards(db)
    db.close()
    r = client.post(f"{API}/documents", headers=headers,
                    files={"file": ("tender.txt", TENDER, "text/plain")})
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]
    # POST /analyses schedules the pipeline as a background task, which the
    # TestClient runs to completion before returning — the real API path.
    r = client.post(f"{API}/analyses", headers=headers, json={"document_id": doc_id, "sector": sector})
    analysis_id = r.json()["id"]
    assert client.get(f"{API}/analyses/{analysis_id}", headers=headers).json()["status"] == "READY"
    return analysis_id


def test_upload_validation_rejects_unsupported_type(client):
    h = login(client)
    r = client.post(f"{API}/documents", headers=h, files={"file": ("x.exe", b"MZ", "application/x-msdownload")})
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "UNSUPPORTED_MEDIA"


def test_requirements_extracted_with_source_and_attributes(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    reqs = client.get(f"{API}/analyses/{analysis_id}/requirements", headers=h).json()
    by_type = {r["requirement_type"] for r in reqs}
    assert {"PARAMETER", "MATERIAL", "REFERENCED_STANDARD", "CERTIFICATION", "DIMENSION"} <= by_type
    # A parameter requirement carries a normalized attribute + source page.
    pressure = next(r for r in reqs if any(a["key"] == "pressure" for a in r["attributes"]))
    attr = next(a for a in pressure["attributes"] if a["key"] == "pressure")
    assert attr["normalized_value"] == 10.0 and attr["canonical_unit"] == "bar"
    assert pressure["source_page"] == 1


def test_recommendations_are_grounded_and_traceable(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    recs = client.get(f"{API}/analyses/{analysis_id}/recommendations", headers=h).json()
    assert recs, "expected recommendations"
    # Every recommendation is grounded in evidence and carries transparent signals.
    for rc in recs:
        assert rc["evidence"], "recommendation must cite evidence"
        assert "scope_match" in rc["signals"]
        assert rc["requirement_id"]  # traceability
    # The explicitly referenced standard is directly applicable for the
    # requirement that references it (a standard may be recommended for several
    # requirements with different applicability classes — that is the design).
    assert any(
        rc["standard"]["is_number"] == "IS 1520 : 2007" and rc["applicability_class"] == "DIRECTLY_APPLICABLE"
        for rc in recs
    )
    # Demo data is labelled, never passed off as authoritative.
    assert all(rc["standard"]["data_origin"] == "DEMO_SYNTHETIC" for rc in recs)


def test_edit_requirement_changes_recommendations(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)
    reqs = client.get(f"{API}/analyses/{analysis_id}/requirements", headers=h).json()
    material = next(r for r in reqs if r["requirement_type"] == "MATERIAL")

    before = {rc["standard"]["is_number"] for rc in
              client.get(f"{API}/analyses/{analysis_id}/recommendations?requirement_id={material['id']}", headers=h).json()}

    # Officer edits the requirement to describe reinforced concrete instead.
    # The PATCH schedules a background re-analysis of just this requirement,
    # which the TestClient runs before returning.
    client.patch(f"{API}/requirements/{material['id']}", headers=h,
                 json={"description": "The structure shall use reinforced concrete and cement as per civil code."})

    after = {rc["standard"]["is_number"] for rc in
             client.get(f"{API}/analyses/{analysis_id}/recommendations?requirement_id={material['id']}", headers=h).json()}
    assert after != before  # results demonstrably changed
    assert any("456" in n for n in after)  # concrete code surfaced


def test_review_decision_persists(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)
    recs = client.get(f"{API}/analyses/{analysis_id}/recommendations", headers=h).json()
    target = recs[0]["id"]

    r = client.post(f"{API}/analyses/{analysis_id}/reviews/decisions", headers=h,
                    json={"target_type": "recommendation", "target_id": target, "decision": "ACCEPT", "reason": "ok"})
    assert r.status_code == 201

    # Persisted: visible after a fresh GET, and the recommendation status updated.
    decisions = client.get(f"{API}/analyses/{analysis_id}/reviews/decisions", headers=h).json()
    assert any(d["target_id"] == target and d["decision"] == "ACCEPT" for d in decisions)
    rec = client.get(f"{API}/recommendations/{target}", headers=h).json()
    assert rec["review_status"] == "ACCEPTED"


def test_report_pdf_and_docx_generate(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)
    for fmt, magic in [("PDF", b"%PDF"), ("DOCX", b"PK")]:
        r = client.post(f"{API}/reports", headers=h, json={"analysis_id": analysis_id, "format": fmt})
        assert r.status_code == 201, r.text
        report_id = r.json()["id"]
        dl = client.get(f"{API}/reports/{report_id}/download", headers=h)
        assert dl.status_code == 200
        assert dl.content[:4].startswith(magic[:2])  # real file bytes
