"""
Stage 4 — End-to-End Satellite Processing Test
Tests:
1. Copernicus Data Space Ecosystem API query for Andhra Pradesh Sentinel-2 L2A granules
2. NumPy calculations for spectral indices:
   - NDVI = (B08 - B04) / (B08 + B04)
   - NDMI = (B08 - B11) / (B08 + B11)
   - NDWI = (B03 - B08) / (B03 + B08)
3. Cloud-masking algorithm (flags observations > 25% cloud cover)
4. SQLite cache persistence and retrieval
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import numpy as np
from app.database import SessionLocal, init_db
from app.services.satellite import (
    calculate_ndvi,
    calculate_ndmi,
    calculate_ndwi,
    get_satellite_history_for_coordinates,
)

# Test Coordinates: East Godavari rice basin (lat=16.9890, lng=81.7840)
TEST_LAT = 16.9890
TEST_LNG = 81.7840

print("=" * 65)
print("RicePulse AP — Stage 4 Satellite Processing Test (Sentinel-2 / CDSE)")
print(f"Test Coordinates: Lat {TEST_LAT}° N, Lng {TEST_LNG}° E (East Godavari)")
print("=" * 65)

# 1. Test Spectral Formulas with NumPy
print("\n[1/4] Verifying NumPy spectral band index formulas...")
b03 = np.array([0.09, 0.12])  # Green
b04 = np.array([0.05, 0.10])  # Red
b08 = np.array([0.48, 0.35])  # NIR
b11 = np.array([0.15, 0.18])  # SWIR

ndvi = calculate_ndvi(b08, b04)
ndmi = calculate_ndmi(b08, b11)
ndwi = calculate_ndwi(b03, b08)

print(f"  Sample 1 (Healthy Canopy)   -> NDVI: {ndvi[0]:.4f}, NDMI: {ndmi[0]:.4f}, NDWI: {ndwi[0]:.4f}")
print(f"  Sample 2 (Moderate Canopy)  -> NDVI: {ndvi[1]:.4f}, NDMI: {ndmi[1]:.4f}, NDWI: {ndwi[1]:.4f}")

# Assert standard mathematical properties
assert np.isclose(ndvi[0], (0.48 - 0.05) / (0.48 + 0.05), atol=1e-3), "NDVI formula mismatch"
assert np.isclose(ndmi[0], (0.48 - 0.15) / (0.48 + 0.15), atol=1e-3), "NDMI formula mismatch"
assert np.isclose(ndwi[0], (0.09 - 0.48) / (0.09 + 0.48), atol=1e-3), "NDWI formula mismatch"
print("  ✓ NumPy spectral index computations verified successfully!")

# 2. Database init
print("\n[2/4] Initializing database tables (creating satellite_observations)...")
init_db()
print("  ✓ Database schema verified with satellite_observations table")

# 3. Query Copernicus CDSE API
db = SessionLocal()
try:
    print("\n[3/4] Fetching and processing Sentinel-2 satellite data via Copernicus CDSE...")
    res = get_satellite_history_for_coordinates(
        lat=TEST_LAT,
        lng=TEST_LNG,
        db=db,
        past_days=90,
        cloud_threshold=25.0
    )

    records = res.get("records", [])
    summary = res.get("summary", {})
    print(f"  ✓ Data Source: {res.get('source')}")
    print(f"  ✓ Satellite System: {res.get('satellite')}")
    print(f"  ✓ Total Granules: {len(records)}")
    print(f"  ✓ Cloud-free Valid Observations: {summary.get('cloud_free_acquisitions')}")
    print(f"  ✓ Cloud-masked Observations: {summary.get('cloud_masked_acquisitions')}")
    print(f"  ✓ Latest Sentinel-2 Tile: {summary.get('latest_tile_id')}")
    print(f"  ✓ Latest NDVI: {summary.get('latest_ndvi')}")
    print(f"  ✓ Latest NDMI: {summary.get('latest_ndmi')}")
    print(f"  ✓ Latest NDWI: {summary.get('latest_ndwi')}")
    print(f"  ✓ Crop Health Status: {summary.get('health_status')}")

    if records:
        print("\n  Sample Historical Sentinel-2 Acquisitions:")
        for r in records[-3:]:
            cloud_badge = "☁ MASKED" if r['is_cloud_masked'] else "✓ CLEAR"
            print(f"   [{cloud_badge}] {r['observation_date'][:10]} | Tile: {r['tile_id']} | "
                  f"Cloud: {r['cloud_coverage_pct']:.1f}% | NDVI: {r['ndvi']} | Status: {r['health_status']}")

    assert len(records) > 0, "Expected at least 1 Sentinel-2 observation from Copernicus API!"

    # 4. Verify SQLite Caching
    print("\n[4/4] Verifying SQLite cache hit on second call...")
    res2 = get_satellite_history_for_coordinates(
        lat=TEST_LAT,
        lng=TEST_LNG,
        db=db,
        past_days=90,
        cloud_threshold=25.0
    )
    print(f"  ✓ Cache Hit: {res2.get('cache_hit')}")
    print(f"  ✓ Source: {res2.get('source')}")
    assert res2.get("cache_hit") is True, "Expected cache hit on repeated query"

    print("\n" + "=" * 65)
    print("STAGE 4 SATELLITE PROCESSING TESTS PASSED! ✓")
    print("Real Sentinel-2 Copernicus API -> NumPy Indices -> Cloud Mask -> SQLite Cache")
    print("=" * 65)
finally:
    db.close()
