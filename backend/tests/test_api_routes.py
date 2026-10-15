"""
RicePulse AP — FastAPI Integration & Unit Test Suite
===================================================
Run from backend/ directory:
    venv\\Scripts\\python.exe -m pytest tests/test_api_routes.py -v
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

TEST_MOBILE = "9876543210"
TEST_PASSWORD = "FarmerPassword@2026"


@pytest.fixture(scope="module")
def auth_token():
    """Logs in with test farmer credentials and returns JWT bearer token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"mobile_number": TEST_MOBILE, "password": TEST_PASSWORD},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    assert token is not None
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ── Root & Core Health Tests ──────────────────────────────────────────────────
def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert data["state"] == "Andhra Pradesh"
    assert "stage" in data


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"


# ── Authentication Tests ──────────────────────────────────────────────────────
def test_auth_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"mobile_number": TEST_MOBILE, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"
    assert data["user"]["mobile_number"] == TEST_MOBILE


def test_auth_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"mobile_number": TEST_MOBILE, "password": "WrongPassword123!"},
    )
    assert response.status_code in [400, 401]


def test_auth_me_unauthenticated():
    response = client.get("/api/v1/auth/me")
    assert response.status_code in [401, 403]


def test_auth_me_authenticated(auth_headers):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["mobile_number"] == TEST_MOBILE
    assert "district" in data


# ── Geo Reference Tests (Andhra Pradesh Districts/Mandals) ────────────────────
def test_geo_districts():
    response = client.get("/api/v1/geo/districts")
    assert response.status_code == 200
    districts = response.json()
    assert isinstance(districts, list)
    assert len(districts) > 0
    # Guntur or East Godavari must be in AP list
    district_names = [d.get("name") if isinstance(d, dict) else d for d in districts]
    assert any("Guntur" in str(d) for d in district_names)


def test_geo_mandals_guntur():
    response = client.get("/api/v1/geo/mandals?district=Guntur")
    assert response.status_code == 200
    mandals = response.json()
    assert isinstance(mandals, list)
    assert len(mandals) > 0


# ── Farm Management CRUD Tests ────────────────────────────────────────────────
def test_farm_list_authenticated(auth_headers):
    response = client.get("/api/v1/farms/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_farm_lifecycle_create_and_delete(auth_headers):
    # 1. Create temporary farm
    payload = {
        "farm_name": "Pytest Delta Plot",
        "crop_type": "Rice (వరి)",
        "variety": "BPT 5204 (Samba Mahsuri)",
        "area_acres": 3.5,
        "sowing_date": "2024-07-15",
        "latitude": 16.2415,
        "longitude": 80.6432,
    }
    create_resp = client.post("/api/v1/farms/", json=payload, headers=auth_headers)
    assert create_resp.status_code in [200, 201]
    farm = create_resp.json()
    farm_id = farm["id"]

    # 2. Verify retrieval
    get_resp = client.get(f"/api/v1/farms/{farm_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["farm_name"] == "Pytest Delta Plot"

    # 3. Delete farm
    del_resp = client.delete(f"/api/v1/farms/{farm_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # 4. Confirm deleted
    confirm_resp = client.get(f"/api/v1/farms/{farm_id}", headers=auth_headers)
    assert confirm_resp.status_code == 404


# ── Machine Learning & Stress Engine Tests ────────────────────────────────────
def test_yield_model_metrics(auth_headers):
    response = client.get("/api/v1/yield/model-metrics", headers=auth_headers)
    assert response.status_code == 200
    metrics = response.json()
    assert "best_model" in metrics
    assert "models" in metrics
    assert "Gradient Boosting Regressor" in metrics["models"]


def test_stress_simulate_drought(auth_headers):
    payload = {
        "scenario": "drought",
        "lat": 16.3067,
        "lng": 80.4365,
    }
    response = client.post("/api/v1/stress/simulate", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "primary_cause" in data or "risk_level" in data or "recommended_actions" in data


def test_stress_simulate_heatwave(auth_headers):
    payload = {
        "scenario": "heatwave",
        "lat": 16.3067,
        "lng": 80.4365,
    }
    response = client.post("/api/v1/stress/simulate", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data.get("risk_level") in ["Moderate", "High", "Very High"]


# ── Kisan SMS Notification Engine Tests (Stage 7) ────────────────────────────
def test_sms_status():
    response = client.get("/api/v1/sms/status")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "mode" in data
    assert "cooldown_hours" in data


def test_sms_history_authenticated(auth_headers):
    response = client.get("/api/v1/sms/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_messages" in data
    assert "messages" in data
    assert isinstance(data["messages"], list)


# ── Admin Dashboard & Surveillance Tests (Stage 8) ───────────────────────────
def test_admin_stats_unauthorized():
    response = client.get("/api/v1/admin/stats")
    assert response.status_code in [401, 403]


def test_admin_stats_authorized(auth_headers):
    response = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_farms" in data
    assert "active_sms_consents" in data
    assert "users_by_district" in data
    assert "farms_by_district" in data


def test_admin_user_directory(auth_headers):
    response = client.get("/api/v1/admin/users?limit=10", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert len(data["users"]) > 0


def test_admin_scheduler_status(auth_headers):
    response = client.get("/api/v1/admin/scheduler-status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "scheduler_running" in data
    assert "monitoring_interval_hours" in data


def test_admin_failed_sms_audit(auth_headers):
    response = client.get("/api/v1/admin/failed-sms", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert isinstance(data["logs"], list)
