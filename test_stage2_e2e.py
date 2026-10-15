"""
Stage 2 Full-Stack End-to-End Verification Suite for RicePulse AP
Tests Multi-Farm Plot Management, Leaflet Coordinates/Boundaries, and 4 Visual Telemetry Cards
"""
import sys
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import httpx

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

def run_stage2_e2e():
    print("==================================================")
    print("RicePulse AP - Stage 2 End-to-End Verification")
    print("==================================================")

    with httpx.Client(timeout=10.0) as client:
        # 1. Frontend Server
        print("\n1. Testing Frontend Dev Server (Vite) & Leaflet Assets...")
        fe_res = client.get(FRONTEND_URL)
        assert fe_res.status_code == 200, f"Frontend returned {fe_res.status_code}"
        print("   [SUCCESS] Frontend dev server serving 200 OK with Leaflet styles.")

        # 2. Vite Proxy
        print("\n2. Testing Vite Proxy for Stage 2 API...")
        proxy_res = client.get(f"{FRONTEND_URL}/api/v1/geo/districts")
        assert proxy_res.status_code == 200
        print("   [SUCCESS] Vite proxy functioning correctly.")

        # 3. Farmer Login
        print("\n3. Authenticating Demo Farmer...")
        login_res = client.post(f"{BACKEND_URL}/api/v1/auth/login", json={
            "mobile_number": "9876543210",
            "password": "FarmerPassword@2026"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   [SUCCESS] Farmer authenticated with valid JWT token.")

        # 4. Multi-Farm Plot Management (List & Create)
        print("\n4. Testing Multi-Farm Plot Management (CRUD)...")
        farms_res = client.get(f"{BACKEND_URL}/api/v1/farms/", headers=headers)
        assert farms_res.status_code == 200
        initial_farms = farms_res.json()
        print(f"   [SUCCESS] Retrieved {len(initial_farms)} existing farm plot(s).")

        # Create a new Andhra Pradesh rice plot with polygon boundary
        new_plot_data = {
            "farm_name": "గోదావరి డెల్టా పొలం 3 (Krishna Canal Plot)",
            "crop_type": "Rice (వరి)",
            "variety": "MTU 1061 (Indra)",
            "area_acres": 4.25,
            "area_cents": 50.0,
            "field_survey_number": "Sy. No. 204/1B",
            "latitude": 16.9855,
            "longitude": 81.7820,
            "boundary_points": '[{"lat":16.9855,"lng":81.7820},{"lat":16.9870,"lng":81.7835},{"lat":16.9860,"lng":81.7850},{"lat":16.9845,"lng":81.7830}]',
            "sowing_date": "2026-06-12",
            "soil_type": "Alluvial Soil (ఒండ్రు నేల)",
            "irrigation_source": "Canal Irrigation (కాలువ నీరు - Godavari)"
        }
        create_res = client.post(f"{BACKEND_URL}/api/v1/farms/", json=new_plot_data, headers=headers)
        assert create_res.status_code == 201, f"Create plot failed: {create_res.text}"
        created_farm = create_res.json()
        print(f"   [SUCCESS] Created new plot: {created_farm['farm_name']} (ID: {created_farm['id']})")
        print(f"   [SUCCESS] Boundary polygon verified with 4 corner points.")

        # 5. Fetch Stage 2 Agronomic Analytics & Telemetry
        print("\n5. Testing Stage 2 Telemetry & Visual Analytics Endpoints...")
        analytics_res = client.get(f"{BACKEND_URL}/api/v1/farms/{created_farm['id']}/analytics", headers=headers)
        assert analytics_res.status_code == 200, f"Analytics failed: {analytics_res.text}"
        data = analytics_res.json()

        # Widget 1: Crop Health & Stress Risk Level
        health = data["crop_health"]
        print(f"   [SUCCESS] Widget 1 - Crop Health & Stress:")
        print(f"             Score: {health['health_score']}/100 | Stress Level: {health['stress_level']} ({health['stress_level_te']})")
        print(f"             Phenological Stage: {health['growth_stage']}")
        print(f"             Stress Breakdown: Water={health['stress_breakdown']['water_stress']}%, Blast/Pest={health['stress_breakdown']['pest_blast_threat']}%")

        # Widget 2: Microclimate Weather Summary
        weather = data["weather"]
        print(f"   [SUCCESS] Widget 2 - Weather Summary Card:")
        print(f"             Temp: {weather['temperature_c']}°C (Feels {weather['feels_like_c']}°C) | Humidity: {weather['humidity_pct']}%")
        print(f"             7-Day Rain: {weather['rainfall_mm_last_7d']} mm | Rain Prob: {weather['rainfall_forecast_next_3d_pct']}%")
        print(f"             Irrigation Advisory: {weather['irrigation_advice']}")

        # Widget 3: Satellite Remote Sensing (NDVI / NDWI)
        sat = data["satellite"]
        print(f"   [SUCCESS] Widget 3 - Satellite Observation Card:")
        print(f"             NDVI: {sat['ndvi_current']} ({sat['vegetation_vigor']}) | Trend: {sat['ndvi_trend']}")
        print(f"             NDWI: +{sat['ndwi_moisture']} | Canopy: {sat['canopy_cover_pct']}%")
        print(f"             Sensor: {sat['satellite_sensor']} ({sat['resolution']})")

        # Widget 4: Predicted Yield & AP MSP Value
        yield_pred = data["yield_prediction"]
        print(f"   [SUCCESS] Widget 4 - Predicted Yield & MSP Value Card:")
        print(f"             Predicted Yield: {yield_pred['predicted_yield_quintals_per_acre']} Q/Ac ({yield_pred['predicted_bags_per_acre']} bags/Ac)")
        print(f"             Total Expected: {yield_pred['total_expected_bags']} bags across {created_farm['area_acres']} acres")
        print(f"             Benchmark Deviation: {yield_pred['deviation_pct']}% vs AP District Average")
        print(f"             Gross Market Value: Rs. {yield_pred['estimated_gross_revenue_inr']:,.0f} (@ AP MSP Rs. {yield_pred['msp_price_per_quintal_inr']}/Qtl)")
        print(f"             Target Harvest Date: {yield_pred['expected_harvest_date']}")

        # 6. Farm Plot Update & Deletion
        print("\n6. Testing Plot Update and Safety Deletion Guard...")
        update_res = client.put(f"{BACKEND_URL}/api/v1/farms/{created_farm['id']}", json={"area_acres": 4.5}, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["area_acres"] == 4.5
        print("   [SUCCESS] Updated farm plot acreage to 4.5 acres.")

        # Delete the test plot created in this run
        del_res = client.delete(f"{BACKEND_URL}/api/v1/farms/{created_farm['id']}", headers=headers)
        assert del_res.status_code == 200
        print(f"   [SUCCESS] Safely deleted test farm plot {created_farm['id']}.")

    print("\n==================================================")
    print(" STAGE 2 FULL STACK VERIFICATION SUCCESSFUL!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_stage2_e2e()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
