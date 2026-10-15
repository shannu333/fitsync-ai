import sys
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000")

# 1. Login
res = client.post("/api/v1/auth/login", json={"mobile_number": "9876543210", "password": "FarmerPassword@2026"})
assert res.status_code == 200, f"Login failed: {res.text}"
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login successful. Token obtained.")

# 2. Get farms
res = client.get("/api/v1/farms/", headers=headers)
assert res.status_code == 200, f"Get farms failed: {res.text}"
farms = res.json()
print(f"Retrieved {len(farms)} farm(s). First farm: {farms[0]['farm_name']} (ID: {farms[0]['id']})")
farm_id = farms[0]["id"]

# 3. Add second plot for this farmer if not already added
if len(farms) < 2:
    second_plot = {
        "farm_name": "వరి చేను 2 - Canal Side Plot",
        "crop_type": "Rice (వరి)",
        "variety": "MTU 1010 (Cottondora Sannalu)",
        "area_acres": 2.25,
        "area_cents": 10.0,
        "field_survey_number": "Sy. No. 142/B",
        "latitude": 16.9920,
        "longitude": 81.7910,
        "boundary_points": '[{"lat":16.992,"lng":81.791},{"lat":16.994,"lng":81.792},{"lat":16.993,"lng":81.794},{"lat":16.991,"lng":81.793}]',
        "sowing_date": "2026-06-25",
        "soil_type": "Alluvial Soil (ఒండ్రు నేల)",
        "irrigation_source": "Borewell / Tube Well (బోరుబావి)"
    }
    create_res = client.post("/api/v1/farms/", json=second_plot, headers=headers)
    assert create_res.status_code == 201, f"Create farm failed: {create_res.text}"
    new_farm = create_res.json()
    print(f"Created second farm plot: {new_farm['farm_name']} (ID: {new_farm['id']})")
    farms.append(new_farm)

# 4. Get analytics for both farms
for f in farms[:2]:
    fid = f["id"]
    analytics_res = client.get(f"/api/v1/farms/{fid}/analytics", headers=headers)
    assert analytics_res.status_code == 200, f"Analytics failed for farm {fid}: {analytics_res.text}"
    analytics = analytics_res.json()
    print(f"\n--- Analytics for Farm {fid}: {analytics['farm_name']} ---")
    print(f"  Stage: {analytics['crop_health']['growth_stage']}")
    print(f"  Health Score: {analytics['crop_health']['health_score']}/100 | Stress: {analytics['crop_health']['stress_level']}")
    print(f"  Weather: {analytics['weather']['temperature_c']}°C, {analytics['weather']['humidity_pct']}% humidity")
    print(f"  Satellite: NDVI={analytics['satellite']['ndvi_current']} ({analytics['satellite']['vegetation_vigor']})")
    print(f"  Yield Prediction: {analytics['yield_prediction']['predicted_yield_quintals_per_acre']} Q/Ac ({analytics['yield_prediction']['total_expected_bags']} bags total, Revenue Rs. {analytics['yield_prediction']['estimated_gross_revenue_inr']:,.0f})")

print("\nALL STAGE 2 BACKEND ENDPOINTS VERIFIED SUCCESSFULLY!")
