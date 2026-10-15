"""
RicePulse AP - Stage 1 Backend Verification Suite
Tests registration, login, profile retrieval, AP geographic data, and error handling.
"""
import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

# Ensure tables are created
init_db()

client = TestClient(app)

def test_stage_1_flow():
    print("\n--- Running RicePulse AP Stage 1 Verification Suite ---")

    # 1. Health check & Root
    res = client.get("/")
    assert res.status_code == 200, f"Root endpoint failed: {res.text}"
    print(" Root endpoint responded OK.")

    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(" Health check responded OK.")

    # 2. Andhra Pradesh Geographic Data endpoints
    res = client.get("/api/v1/geo/districts")
    assert res.status_code == 200, f"Districts fetch failed: {res.text}"
    districts = res.json()
    assert len(districts) >= 8, f"Expected AP districts, found {len(districts)}"
    print(f" Loaded {len(districts)} AP districts successfully (e.g. {districts[0]['name']}).")

    # Mandals for East Godavari
    res = client.get("/api/v1/geo/mandals?district=East Godavari")
    assert res.status_code == 200, f"Mandals fetch failed: {res.text}"
    mandals = res.json()
    assert len(mandals) >= 4, f"Expected mandals, got {mandals}"
    print(f" Loaded {len(mandals)} mandals for East Godavari (e.g. {mandals[0]['name']}).")

    # Villages for Kadiam mandal
    res = client.get("/api/v1/geo/villages?district=East Godavari&mandal=Kadiam")
    assert res.status_code == 200, f"Villages fetch failed: {res.text}"
    villages = res.json()
    assert len(villages) >= 3, f"Expected villages, got {villages}"
    print(f" Loaded {len(villages)} villages for Kadiam mandal (e.g. {villages}).")

    # Rice varieties metadata
    res = client.get("/api/v1/geo/rice-varieties")
    assert res.status_code == 200, f"Varieties fetch failed: {res.text}"
    varieties = res.json()
    assert len(varieties) >= 4, f"Expected rice varieties, got {varieties}"
    print(f" Loaded {len(varieties)} rice varieties (e.g. {varieties[0]['name']}).")

    # 3. Farmer Registration Flow
    farmer_payload = {
        "full_name": "Venkata Ramanamurthy",
        "mobile_number": "9876543210",
        "password": "FarmerPassword@2026",
        "district": "East Godavari",
        "mandal": "Kadiam",
        "village": "Muramanda",
        "preferred_language": "Telugu",
        "farm_name": "గోదావరి వరి పొలం (Godavari Delta Plot)",
        "variety": "BPT 5204 (Samba Mahsuri)",
        "area_acres": 4.5,
        "area_cents": 50.0,
        "latitude": 16.9200,
        "longitude": 81.8500,
        "sowing_date": "2026-06-15",
        "soil_type": "Alluvial Soil (ఒండ్రు నేల)",
        "irrigation_source": "Canal Irrigation (కాలువ నీరు - Godavari)",
        "sms_consent": True
    }

    # Clean existing user if test re-run
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    existing = db.query(User).filter(User.mobile_number == "9876543210").first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    reg_res = client.post("/api/v1/auth/register", json=farmer_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert "access_token" in reg_data, "No access token in registration response"
    assert reg_data["user"]["full_name"] == "Venkata Ramanamurthy"
    assert len(reg_data["user"]["farms"]) == 1
    assert reg_data["user"]["consent"]["consent_given"] is True
    print(" Farmer registration succeeded with primary farm and SMS consent!")

    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Duplicate registration check
    dup_res = client.post("/api/v1/auth/register", json=farmer_payload)
    assert dup_res.status_code == 400, "Duplicate mobile number should have been rejected"
    print(" Duplicate registration rejection verified.")

    # 5. Farmer Login Flow
    login_payload = {
        "mobile_number": "9876543210",
        "password": "FarmerPassword@2026"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    assert "access_token" in login_data
    print(" Farmer login succeeded and returned valid JWT token.")

    # 6. Authenticated Profile Fetch (/auth/me)
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"Fetch profile failed: {me_res.text}"
    profile = me_res.json()
    assert profile["mobile_number"] == "9876543210"
    assert profile["district"] == "East Godavari"
    print(f" Authenticated /auth/me profile verified for {profile['full_name']}.")

    # 7. Profile Update
    update_res = client.put("/api/v1/user/profile", json={"village": "Jegurupadu"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["village"] == "Jegurupadu"
    print(" Profile update verified.")

    print("\n All Backend Stage 1 Endpoints & Flows Passed Perfectly!")

if __name__ == "__main__":
    test_stage_1_flow()
