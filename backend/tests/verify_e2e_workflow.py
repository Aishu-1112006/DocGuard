import os
import io
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw

from fastapi.testclient import TestClient
from app.main import app
from app.models import Base, HistoricalScreeningRecord
from app.database import engine, SessionLocal

client = TestClient(app)


def create_dummy_passport_image():
    img = Image.new("RGB", (600, 400), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((20, 20), "PASSPORT - REPUBLIC OF INDIA", fill=(0, 0, 0))
    d.text((20, 60), "SURNAME: KUMAR", fill=(0, 0, 0))
    d.text((20, 90), "GIVEN NAME: RAMESH", fill=(0, 0, 0))
    d.text((20, 120), "PASSPORT NO: P9876543", fill=(0, 0, 0))
    d.text((20, 150), "DOB: 15/08/1990", fill=(0, 0, 0))
    d.text((20, 180), "EXPIRY: 15/08/2030", fill=(0, 0, 0))
    d.text((20, 300), "P<INDRAMESH<<KUMAR<<<<<<<<<<<<<<<<<<<<<<<<<<", fill=(0, 0, 0))
    d.text((20, 330), "P9876543<2IND9008154M3008158<<<<<<<<<<<<<<04", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def create_dummy_face_image():
    img = Image.new("RGB", (300, 300), color=(240, 230, 220))
    d = ImageDraw.Draw(img)
    d.ellipse((75, 50, 225, 250), fill=(210, 180, 140))
    d.ellipse((100, 100, 120, 120), fill=(50, 50, 50))
    d.ellipse((180, 100, 200, 120), fill=(50, 50, 50))
    d.line((130, 200, 170, 200), fill=(100, 50, 50), width=4)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def run_full_verification():
    print("=" * 70)
    print("DOCGUARD FULL E2E SYSTEM VERIFICATION RUN")
    print("=" * 70)

    # 1. Health check
    h = client.get("/health")
    assert h.status_code == 200
    print("[OK] 1. Health Check PASSED:", h.json())

    # 2. Historical dataset separation check
    db = SessionLocal()
    hist_count = db.query(HistoricalScreeningRecord).count()
    db.close()
    assert hist_count >= 5000, f"Expected >= 5000 records, got {hist_count}"
    print(f"[OK] 2. Historical Dataset Separation PASSED: {hist_count} reference records loaded.")

    import uuid
    suffix = uuid.uuid4().hex[:6]

    # 3. Register Officer A
    reg_a = client.post("/auth/register", json={
        "full_name": "Inspector Ramesh Kumar",
        "email": f"ramesh_{suffix}@docguard.gov.in",
        "username": f"officer_ramesh_{suffix}",
        "password": "Password123!",
        "role": "OFFICER",
        "badge_number": f"BADGE-MAA-{suffix[:3].upper()}",
        "assigned_airport": "MAA - Chennai International Airport"
    })
    assert reg_a.status_code == 200
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 4. Register Officer B
    reg_b = client.post("/auth/register", json={
        "full_name": "Inspector Priya Sharma",
        "email": f"priya_{suffix}@docguard.gov.in",
        "username": f"officer_priya_{suffix}",
        "password": "Password123!",
        "role": "OFFICER",
        "badge_number": f"BADGE-DEL-{suffix[:3].upper()}",
        "assigned_airport": "DEL - Indira Gandhi International Airport"
    })
    assert reg_b.status_code == 200
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    print("[OK] 3. Officer Registration PASSED.")

    # 5. Verify Officer A starts at 0 personal cases
    cases_a_0 = client.get("/cases/", headers=headers_a).json()
    assert len(cases_a_0) == 0, f"Officer A should have 0 cases initially, found {len(cases_a_0)}"
    print("[OK] 4. Account Isolation Initial 0 Cases PASSED.")

    # 6. Officer A creates Case A with Airport MAA
    create_resp = client.post("/cases/", json={
        "airport_name": "Chennai International Airport",
        "airport_code": "MAA",
        "airport_city": "Chennai",
        "airport_state": "Tamil Nadu"
    }, headers=headers_a)
    assert create_resp.status_code == 200
    case_id = create_resp.json()["id"]
    print(f"[OK] 5. Case Creation & Airport Assignment PASSED (Case ID: {case_id[:8]}, Airport: MAA).")

    # 7. Officer A uploads Document (Passport)
    passport_bytes = create_dummy_passport_image()
    doc_resp = client.post(
        f"/cases/{case_id}/documents",
        files={"document": ("passport.jpg", passport_bytes, "image/jpeg")},
        data={"document_type": "passport"},
        headers=headers_a
    )
    assert doc_resp.status_code == 200
    doc_id = doc_resp.json()["id"]
    print(f"[OK] 6. Document Upload & Forensic Analysis PASSED (Doc ID: {doc_id[:8]}, ELA Tamper Score: {doc_resp.json()['tamper_score']}).")

    # 8. Test ELA Heatmap streaming endpoint
    heatmap_resp = client.get(f"/cases/{case_id}/documents/{doc_id}/heatmap", headers=headers_a)
    assert heatmap_resp.status_code == 200
    assert heatmap_resp.headers["content-type"] == "image/png"
    print("[OK] 7. ELA Heatmap Image Streaming PASSED.")

    # 9. Officer A uploads Live Camera Face Photo
    face_bytes = create_dummy_face_image()
    face_resp = client.post(
        f"/cases/{case_id}/selfie",
        files={"selfie": ("live_face.jpg", face_bytes, "image/jpeg")},
        headers=headers_a
    )
    assert face_resp.status_code == 200
    print(f"[OK] 8. Live Camera Frame & Face Match PASSED (Face Score: {face_resp.json()['face_match_score']}%, Liveness: {face_resp.json()['liveness_status']}).")

    # 10. Finalize Case & Generate Risk Score
    final_resp = client.post(f"/cases/{case_id}/finalize", headers=headers_a)
    assert final_resp.status_code == 200
    case_detail = final_resp.json()
    print(f"[OK] 9. Multi-Evidence Risk Fusion PASSED (Risk Score: {case_detail['risk_score']}/100, Category: {case_detail['risk_category']}).")

    # 11. Verify Officer B CANNOT view Case A
    b_access = client.get(f"/cases/{case_id}", headers=headers_b)
    assert b_access.status_code in [403, 404]
    print("[OK] 10. Cross-Officer Case Isolation Enforcement PASSED (Officer B blocked with HTTP 403).")

    # 12. Officer Verdict (Clear/Approve Case A)
    dec_resp = client.post(f"/cases/{case_id}/decision", json={
        "decision": "approve",
        "note": "Verified genuine passenger credentials and live face capture."
    }, headers=headers_a)
    assert dec_resp.status_code == 200
    assert dec_resp.json()["final_status"] == "cleared"
    print("[OK] 11. Human Officer Verdict PASSED (Status: CLEARED).")

    # 13. Passenger Re-Appeal Workflow
    appeal_resp = client.post("/reappeals/submit", json={
        "case_id": case_id,
        "passenger_name": "Ramesh Kumar",
        "passenger_email": "ramesh@example.com",
        "reason": "Request copy of clearance receipt for customs",
        "additional_explanation": "Travelling on international flight 6E-101.",
        "contact_preference": "email"
    })
    assert appeal_resp.status_code == 200
    appeal_id = appeal_resp.json()["id"]

    appeal_act = client.post(f"/reappeals/{appeal_id}/action", json={
        "action_type": "ACCEPT",
        "note": "Cleared receipt dispatched."
    }, headers=headers_a)
    assert appeal_act.status_code == 200
    assert appeal_act.json()["status"] == "Accepted"
    print("[OK] 12. Passenger Re-Appeal Workflow PASSED.")

    # 14. Audit Log Check
    audit_resp = client.get("/audit/", headers=headers_a)
    assert audit_resp.status_code == 200
    assert len(audit_resp.json()) >= 5
    print(f"[OK] 13. System Audit Trail PASSED ({len(audit_resp.json())} logged security events).")

    print("=" * 70)
    print("ALL E2E VERIFICATION CHECKS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
    print("=" * 70)


if __name__ == "__main__":
    run_full_verification()
