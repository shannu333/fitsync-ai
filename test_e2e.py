"""
End-to-end integration test for RicePulse AP
Tests both backend server (port 8000) and frontend Vite server (port 5173) with proxy.
"""
import sys
import io

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import httpx

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

def run_e2e_tests():
    print("==================================================")
    print("RicePulse AP - Stage 1 End-to-End Verification")
    print("==================================================")

    with httpx.Client(timeout=10.0) as client:
        # 1. Frontend HTTP check
        print("\n1. Verifying Frontend Dev Server (Vite)...")
        fe_res = client.get(FRONTEND_URL)
        assert fe_res.status_code == 200, f"Frontend server returned {fe_res.status_code}"
        assert "RicePulse AP" in fe_res.text or "<div id=\"root\">" in fe_res.text
        print("   [SUCCESS] Frontend dev server is serving index.html cleanly (200 OK).")

        # 2. Vite Proxy verification
        print("\n2. Verifying Vite API Reverse Proxy...")
        proxy_res = client.get(f"{FRONTEND_URL}/api/v1/geo/districts")
        assert proxy_res.status_code == 200, f"Vite proxy returned {proxy_res.status_code}"
        districts = proxy_res.json()
        assert len(districts) >= 8
        print(f"   [SUCCESS] Vite proxy correctly routed to FastAPI backend. Loaded {len(districts)} AP districts.")

        # 3. Andhra Pradesh Administrative Geographic Cascading
        print("\n3. Testing AP Geographic Hierarchy (Districts -> Mandals -> Villages)...")
        # East Godavari
        mandal_res = client.get(f"{BACKEND_URL}/api/v1/geo/mandals?district=East Godavari")
        assert mandal_res.status_code == 200
        mandals = mandal_res.json()
        print(f"   [SUCCESS] Mandals for East Godavari: {[m['name'] for m in mandals]}")

        # Kadiam mandal
        village_res = client.get(f"{BACKEND_URL}/api/v1/geo/villages?district=East Godavari&mandal=Kadiam")
        assert village_res.status_code == 200
        villages = village_res.json()
        print(f"   [SUCCESS] Villages in Kadiam: {villages}")
        assert "Muramanda" in villages or "Kadiam" in villages

        # 4. Rice Farmer Registration
        print("\n4. Testing Rice Farmer Registration with AP Specifics...")
        test_mobile = "9988776655"
        reg_payload = {
            "full_name": "Appala Naidu Garu",
            "mobile_number": test_mobile,
            "password": "FarmerPassword@2026",
            "district": "West Godavari",
            "mandal": "Bhimavaram",
            "village": "Dirusumarru",
            "preferred_language": "Telugu",
            "farm_name": "భీమవరం వరి చేను (Bhimavaram Rice Field)",
            "variety": "MTU 1061 (Indra)",
            "area_acres": 3.75,
            "area_cents": 25.0,
            "latitude": 16.5449,
            "longitude": 81.5212,
            "sowing_date": "2026-06-10",
            "soil_type": "Black Clay / Cotton Soil (నల్ల రేగడి నేల)",
            "irrigation_source": "Canal Irrigation (కాలువ నీరు - Godavari)",
            "sms_consent": True
        }

        login_res = client.post(f"{BACKEND_URL}/api/v1/auth/login", json={"mobile_number": test_mobile, "password": "FarmerPassword@2026"})
        if login_res.status_code == 200:
            print("   (Farmer already registered, testing login directly)")
            token = login_res.json()["access_token"]
            farmer_user = login_res.json()["user"]
        else:
            reg_res = client.post(f"{BACKEND_URL}/api/v1/auth/register", json=reg_payload)
            assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
            data = reg_res.json()
            token = data["access_token"]
            farmer_user = data["user"]
            print(f"   [SUCCESS] Farmer Registered: {farmer_user['full_name']} (ID: {farmer_user['id']})")
            print(f"   [SUCCESS] Primary Farm registered: {farmer_user['farms'][0]['farm_name']} ({farmer_user['farms'][0]['area_acres']} acres)")
            print(f"   [SUCCESS] SMS Consent recorded: {farmer_user['consent']['consent_given']}")

        headers = {"Authorization": f"Bearer {token}"}

        # 5. Farmer Login
        print("\n5. Testing Farmer Login Endpoint...")
        login_res = client.post(f"{BACKEND_URL}/api/v1/auth/login", json={
            "mobile_number": test_mobile,
            "password": "FarmerPassword@2026"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        assert "access_token" in login_data
        print(f"   [SUCCESS] JWT Token issued successfully. Token type: {login_data['token_type']}")

        # 6. Authenticated User Profile (/auth/me)
        print("\n6. Testing Authenticated /auth/me Endpoint...")
        me_res = client.get(f"{BACKEND_URL}/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200, f"Profile fetch failed: {me_res.text}"
        profile = me_res.json()
        assert profile["mobile_number"] == test_mobile
        assert profile["district"] == "West Godavari"
        print(f"   [SUCCESS] Authenticated profile verified: {profile['full_name']} from {profile['village']}, {profile['mandal']}")

        # 7. Update Farmer Profile
        print("\n7. Testing Profile Update Endpoint...")
        update_res = client.put(f"{BACKEND_URL}/api/v1/user/profile", json={"full_name": "Appala Naidu (Updated)"}, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["full_name"] == "Appala Naidu (Updated)"
        print("   [SUCCESS] Farmer profile updated successfully.")

        # 8. SMS Consent Management
        print("\n8. Testing SMS Consent Toggle...")
        consent_res = client.post(f"{BACKEND_URL}/api/v1/user/consent?consent_given=false", headers=headers)
        assert consent_res.status_code == 200
        assert consent_res.json()["consent_given"] is False
        print("   [SUCCESS] SMS Consent paused successfully.")

        consent_res = client.post(f"{BACKEND_URL}/api/v1/user/consent?consent_given=true", headers=headers)
        assert consent_res.status_code == 200
        assert consent_res.json()["consent_given"] is True
        print("   [SUCCESS] SMS Consent re-activated successfully.")

    print("\n==================================================")
    print(" STAGE 1 FULL STACK VERIFICATION SUCCESSFUL!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_e2e_tests()
    except Exception as e:
        print(f"\nError during verification: {e}")
        sys.exit(1)
