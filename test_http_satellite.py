"""
End-to-End HTTP test for Stage 4 Sentinel-2 Satellite API against running backend
"""
import sys, io, httpx
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

print("1. Logging in as farmer (9876543210)...")
login_resp = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={
    "mobile_number": "9876543210",
    "password": "FarmerPassword@2026"
})
assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("  ✓ Logged in successfully")

print("2. Fetching user farms...")
farms_resp = httpx.get(f"{BASE_URL}/api/v1/farms/", headers=headers)
assert farms_resp.status_code == 200
farms = farms_resp.json()
farm_id = farms[0]["id"]
farm_name = farms[0]["farm_name"]
print(f"  ✓ Target Farm: ID {farm_id} - '{farm_name}'")

print(f"3. Querying /api/v1/satellite/farm/{farm_id}...")
sat_resp = httpx.get(
    f"{BASE_URL}/api/v1/satellite/farm/{farm_id}?past_days=90&cloud_threshold=25.0",
    headers=headers,
    timeout=30.0
)
print("  Status code:", sat_resp.status_code)
assert sat_resp.status_code == 200, f"Satellite API failed: {sat_resp.text}"

data = sat_resp.json()
print("  ✓ Source:", data.get("source"))
print("  ✓ Satellite:", data.get("satellite"))
print("  ✓ Total Acquisitions:", len(data.get("records", [])))
summary = data.get("summary", {})
print("  ✓ Latest Observation Date:", summary.get("latest_observation_date"))
print("  ✓ Latest Tile:", summary.get("latest_tile_id"))
print("  ✓ Latest NDVI:", summary.get("latest_ndvi"))
print("  ✓ Latest NDMI:", summary.get("latest_ndmi"))
print("  ✓ Latest NDWI:", summary.get("latest_ndwi"))
print("  ✓ Health Status:", summary.get("health_status"))

print("\n✓ Stage 4 Satellite endpoint successfully verified end-to-end!")
