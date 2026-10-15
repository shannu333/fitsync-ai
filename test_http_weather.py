"""
Test login and /api/v1/weather/farm/{id} over HTTP against the running backend server.
"""
import sys, io, httpx
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

print("1. Logging in as farmer (9876543210)...")
login_resp = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={
    "mobile_number": "9876543210",
    "password": "FarmerPassword@2026"
})
print("Login Status:", login_resp.status_code)
assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
token = login_resp.json()["access_token"]
user = login_resp.json()["user"]
print(f"Logged in: {user['full_name']} ({user['district']})")

headers = {"Authorization": f"Bearer {token}"}

print("\n2. Getting user farms...")
farms_resp = httpx.get(f"{BASE_URL}/api/v1/farms/", headers=headers)
print("Farms Status:", farms_resp.status_code)
assert farms_resp.status_code == 200
farms = farms_resp.json()
print(f"User has {len(farms)} farm(s): {[f['farm_name'] for f in farms]}")

farm_id = farms[0]["id"]
print(f"\n3. Requesting real weather for Farm ID {farm_id} ({farms[0]['farm_name']})...")
weather_resp = httpx.get(f"{BASE_URL}/api/v1/weather/farm/{farm_id}?past_days=30&forecast_days=3", headers=headers)
print("Weather Status:", weather_resp.status_code)
assert weather_resp.status_code == 200, f"Weather endpoint error: {weather_resp.text}"

w_data = weather_resp.json()
print("Source:", w_data.get("source"))
print("Cache Hit:", w_data.get("cache_hit"))
print("Records count:", len(w_data.get("records", [])))
print("Data Provider:", w_data.get("data_provider"))
print("Summary:", w_data.get("summary"))

print("\n✓ Stage 3 backend weather endpoint is fully operational!")
