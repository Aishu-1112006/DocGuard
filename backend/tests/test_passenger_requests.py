import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app as fastapi_app

from app.database import Base, engine, run_auto_migrations
import app.models

def test_passenger_chatbot_and_requests():
    fastapi_app.dependency_overrides.clear()
    Base.metadata.create_all(bind=engine)
    run_auto_migrations()
    client = TestClient(fastapi_app)
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200

    # 2. Register officer for auth header
    import uuid
    s = uuid.uuid4().hex[:6]
    reg = client.post("/auth/register", json={
        "full_name": "Test Officer",
        "email": f"test_{s}@docguard.gov.in",
        "username": f"officer_{s}",
        "password": "Password123!",
        "role": "OFFICER",
        "badge_number": f"BADGE-{s.upper()}",
        "assigned_airport": "MAA - Chennai"
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create case
    case_res = client.post("/cases/", json={
        "airport_name": "Test Airport",
        "airport_code": "TST",
        "airport_city": "Test City",
        "airport_state": "Test State"
    }, headers=headers)
    assert case_res.status_code == 200
    case_id = case_res.json()["id"]

    # 3. Chatbot query
    chat_res = client.post(f"/passenger/cases/{case_id}/chat", json={"case_id": case_id, "question": "Why was I flagged?"})
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "answer" in chat_data
    assert len(chat_data["quick_actions"]) > 0

    # 4. Submit passenger request
    req_res = client.post(f"/passenger/cases/{case_id}/requests", json={
        "passenger_name": "Test Passenger",
        "passenger_email": "passenger@example.com",
        "request_type": "re_verification",
        "subject": "Requesting Re-Verification",
        "message": "My document is valid and clear.",
        "supporting_information": "Passport issued in 2022"
    })
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["request_id"].startswith("REQ-")
    assert req_data["status"] == "PENDING"
    req_id = req_data["id"]

    # 5. Officer respond
    resp_act = client.post(f"/passenger/requests/{req_id}/action", json={
        "status": "RESOLVED",
        "officer_response": "Request reviewed and resolved successfully."
    }, headers=headers)
    assert resp_act.status_code == 200
    assert resp_act.json()["status"] == "RESOLVED"

    # 6. Fetch case PDF report
    pdf_res = client.get(f"/cases/{case_id}/pdf-report", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b'%PDF')
    assert "application/pdf" in pdf_res.headers.get("content-type", "")

if __name__ == "__main__":
    pytest.main(["-s", __file__])
