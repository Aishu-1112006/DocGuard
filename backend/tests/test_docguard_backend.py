import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import HistoricalScreeningRecord, Case, Officer

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_docguard.db"

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_officer_registration_and_account_isolation():
    # 1. Register Officer A
    resp_a = client.post("/auth/register", json={
        "full_name": "Inspector Ramesh Kumar",
        "email": "ramesh@docguard.gov.in",
        "username": "ramesh_officer",
        "password": "Password123!",
        "role": "OFFICER",
        "badge_number": "BADGE-MAA-404",
        "assigned_airport": "MAA - Chennai International Airport"
    })
    assert resp_a.status_code == 200
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Officer B
    resp_b = client.post("/auth/register", json={
        "full_name": "Inspector Priya Sharma",
        "email": "priya@docguard.gov.in",
        "username": "priya_officer",
        "password": "Password123!",
        "role": "OFFICER",
        "badge_number": "BADGE-DEL-102",
        "assigned_airport": "DEL - Indira Gandhi International Airport"
    })
    assert resp_b.status_code == 200
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # MANDATORY TEST 1: Officer A starts at 0 cases
    cases_a_initial = client.get("/cases/", headers=headers_a).json()
    assert len(cases_a_initial) == 0

    # MANDATORY TEST 2: Officer B starts at 0 cases
    cases_b_initial = client.get("/cases/", headers=headers_b).json()
    assert len(cases_b_initial) == 0

    # 3. Officer A creates Case A
    case_a_resp = client.post("/cases/", json={
        "airport_name": "Chennai International Airport",
        "airport_code": "MAA",
        "airport_city": "Chennai",
        "airport_state": "Tamil Nadu"
    }, headers=headers_a)
    assert case_a_resp.status_code == 200
    case_a_id = case_a_resp.json()["id"]

    # Officer A now sees 1 case
    cases_a_after = client.get("/cases/", headers=headers_a).json()
    assert len(cases_a_after) == 1
    assert cases_a_after[0]["id"] == case_a_id

    # MANDATORY TEST 3: Officer B MUST NOT see Case A
    cases_b_after = client.get("/cases/", headers=headers_b).json()
    assert len(cases_b_after) == 0

    # MANDATORY TEST 4: Officer B attempting to access Case A must be blocked (403 Forbidden)
    get_a_by_b = client.get(f"/cases/{case_a_id}", headers=headers_b)
    assert get_a_by_b.status_code in [403, 404]


def test_reappeal_workflow():
    # Login Officer A
    login_resp = client.post("/auth/login", json={
        "email": "ramesh@docguard.gov.in",
        "password": "Password123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Case
    case_resp = client.post("/cases/", json={"airport_name": "MAA"}, headers=headers)
    case_id = case_resp.json()["id"]

    # Passenger submits reappeal
    appeal_resp = client.post("/reappeals/submit", json={
        "case_id": case_id,
        "passenger_name": "Anand Mohan",
        "passenger_email": "anand@example.com",
        "reason": "Name spelling difference on passport due to middle name expansion",
        "additional_explanation": "My national ID includes full expanded middle name.",
        "contact_preference": "email"
    })
    assert appeal_resp.status_code == 200
    appeal_id = appeal_resp.json()["id"]
    assert appeal_resp.json()["status"] == "Submitted"

    # Officer views reappeals
    appeals_list = client.get("/reappeals/", headers=headers).json()
    assert len(appeals_list) >= 1

    # Officer performs review action ACCEPT
    action_resp = client.post(f"/reappeals/{appeal_id}/action", json={
        "action_type": "ACCEPT",
        "note": "Verified explanation against presented national ID copy. Cleared."
    }, headers=headers)
    assert action_resp.status_code == 200
    assert action_resp.json()["status"] == "Accepted"
