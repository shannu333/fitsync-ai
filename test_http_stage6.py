"""
Full End-to-End HTTP test for Stage 6 ML Yield Prediction and Recommendations
"""
import sys, io, httpx
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

print("1. Authenticating as farmer...")
login_resp = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={
    "mobile_number": "9876543210",
    "password": "FarmerPassword@2026"
})
assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("  ✓ Logged in successfully")

print("\n2. Fetching Model Metrics (/api/v1/yield/model-metrics)...")
metrics_resp = httpx.get(f"{BASE_URL}/api/v1/yield/model-metrics", headers=headers)
assert metrics_resp.status_code == 200, f"Failed: {metrics_resp.text}"
metrics_data = metrics_resp.json()
print("  ✓ Best Model:", metrics_data.get("best_model"))
print("  ✓ Dataset:", metrics_data.get("dataset_source"))
for model_name, m in metrics_data.get("models", {}).items():
    print(f"    • {model_name}: R²={m['R2_Score']}, RMSE={m['RMSE_tonnes_ha']} t/ha, Accuracy={m['accuracy_pct']}%")

print("\n3. Testing Custom Yield Prediction (/api/v1/yield/predict-custom)...")
custom_resp = httpx.post(
    f"{BASE_URL}/api/v1/yield/predict-custom",
    headers=headers,
    json={
        "district": "East Godavari",
        "season": "Kharif",
        "area_acres": 4.5,
        "peak_ndvi": 0.72,
        "seasonal_rainfall_mm": 980.0,
        "mean_temp_max_c": 32.0,
        "humidity_pct": 82.0,
        "soil_type": "Alluvial Delta",
        "irrigation_type": "Canal Delta",
    }
)
assert custom_resp.status_code == 200, f"Custom yield failed: {custom_resp.text}"
custom_data = custom_resp.json()
print("  ✓ Predicted Yield:", custom_data.get("predicted_tonnes_per_hectare"), "t/ha")
print("  ✓ Predicted Range:", custom_data.get("tonnes_per_hectare_range"), "t/ha")
print("  ✓ Yield per Acre :", custom_data.get("predicted_kg_per_acre"), "kg/acre")
print("  ✓ Total 75kg Bags:", custom_data.get("total_75kg_bags"), "bags")

print("\n4. Fetching Farm 1 Yield Prediction & Recommendations (/api/v1/yield/farm/1)...")
farm_yield_resp = httpx.get(f"{BASE_URL}/api/v1/yield/farm/1", headers=headers, timeout=25.0)
assert farm_yield_resp.status_code == 200, f"Farm yield failed: {farm_yield_resp.text}"
farm_yield_data = farm_yield_resp.json()
pred = farm_yield_data.get("prediction", {})
print("  ✓ Farm Name    :", farm_yield_data.get("farm_name"))
print("  ✓ Season       :", farm_yield_data.get("season"))
print("  ✓ Model Used   :", farm_yield_data.get("model_used"))
print("  ✓ Yield (t/ha) :", pred.get("tonnes_per_hectare"), "t/ha", pred.get("tonnes_per_hectare_range"))
print("  ✓ Yield (kg/ac):", pred.get("kg_per_acre"), "kg/acre")
print("  ✓ Total 75kg Bags:", pred.get("total_75kg_bags"), "bags", pred.get("total_75kg_bags_range"))
print("  ✓ Regional Comp:", farm_yield_data.get("regional_comparison"))

recs = farm_yield_data.get("recommendations", [])
print(f"  ✓ Non-pesticide Recommendations: {len(recs)} items")
for r in recs[:2]:
    print(f"    - [{r['category']}] {r['title']}: {r['action'][:75]}...")

print("\n5. Testing Stress Assessment Endpoint (/api/v1/stress/farm/1)...")
stress_resp = httpx.get(f"{BASE_URL}/api/v1/stress/farm/1", headers=headers, timeout=25.0)
assert stress_resp.status_code == 200, f"Stress failed: {stress_resp.text}"
stress_data = stress_resp.json()
print("  ✓ Overall Risk Score:", stress_data.get("overall_risk_score"))
print("  ✓ Risk Level        :", stress_data.get("risk_level"), f"({stress_data.get('risk_level_te')})")
print("  ✓ Primary Cause     :", stress_data.get("primary_cause"))
print("  ✓ Confidence        :", stress_data.get("confidence_pct"), "%")
print("  ✓ Disclaimer        :", stress_data.get("disclaimer")[:80], "...")

print("\n" + "=" * 65)
print("ALL STAGE 6 HTTP ENDPOINTS VERIFIED & FULLY OPERATIONAL! ✓")
print("=" * 65)
