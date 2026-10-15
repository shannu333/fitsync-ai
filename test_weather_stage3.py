"""
Stage 3 — End-to-End Weather API Test
Tests: Open-Meteo live call → SQLite cache insert → cache hit verification
Coordinates: East Godavari, Andhra Pradesh (lat=16.99, lng=81.78)
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal, init_db
from app.services.weather import get_weather_for_coordinates

TEST_LAT = 16.9890
TEST_LNG = 81.7840
LOCATION = "East Godavari (Kadiam area)"

print("=" * 60)
print(f"RicePulse AP — Stage 3 Weather API Test")
print(f"Location : {LOCATION}")
print(f"Coords   : lat={TEST_LAT}, lng={TEST_LNG}")
print("=" * 60)

# Initialize DB (creates weather_cache table)
print("\n[1/4] Initializing database and creating weather_cache table...")
init_db()
print("      ✓ Database tables created/verified")

db = SessionLocal()

try:
    # ── Test 1: Fresh API call ────────────────────────────────────────────
    print("\n[2/4] Calling Open-Meteo API (fresh fetch)...")
    result = get_weather_for_coordinates(TEST_LAT, TEST_LNG, db, past_days=30, forecast_days=3)

    if result['source'] == 'error':
        print(f"      ✗ API Error: {result.get('api_error')}")
        print("      → Check internet connection or Open-Meteo availability")
        sys.exit(1)

    records = result['records']
    print(f"      ✓ Source     : {result['source']}")
    print(f"      ✓ Cache hit  : {result['cache_hit']}")
    print(f"      ✓ Records    : {len(records)} days")
    print(f"      ✓ Lat/Lng    : {result['lat']}, {result['lng']}")

    if records:
        first = records[0]
        last  = records[-1]
        print(f"\n      First record: {first['date']}")
        print(f"        Temp max  : {first['temp_max']} °C")
        print(f"        Temp min  : {first['temp_min']} °C")
        print(f"        Rainfall  : {first['precipitation']} mm")
        print(f"        Humidity  : {first['humidity']} %")
        print(f"        Solar     : {first['solar_radiation']} MJ/m²")
        print(f"\n      Last record : {last['date']}")
        print(f"        Temp max  : {last['temp_max']} °C")
        print(f"        Temp min  : {last['temp_min']} °C")
        print(f"        Rainfall  : {last['precipitation']} mm")

    summary = result.get('summary', {})
    print(f"\n      Summary Stats:")
    print(f"        Avg temp     : {summary.get('avg_temp')} °C")
    print(f"        Total rain   : {summary.get('total_rainfall_mm')} mm")
    print(f"        Rainy days   : {summary.get('rainy_days')}")
    print(f"        Avg humidity : {summary.get('avg_humidity')} %")

    # ── Test 2: Cache hit ─────────────────────────────────────────────────
    print("\n[3/4] Fetching same coordinates again (expect cache hit)...")
    result2 = get_weather_for_coordinates(TEST_LAT, TEST_LNG, db, past_days=30, forecast_days=3)
    print(f"      ✓ Source     : {result2['source']}")
    print(f"      ✓ Cache hit  : {result2['cache_hit']}")
    print(f"      ✓ Records    : {len(result2['records'])} days")
    assert result2['cache_hit'] == True, "Expected cache hit on second call!"
    assert result2['source'] == 'cache', f"Expected 'cache', got '{result2['source']}'"
    print("      ✓ Cache logic verified correctly!")

    # ── Test 3: Guntur coordinates ────────────────────────────────────────
    print("\n[4/4] Testing Guntur coordinates (fresh area)...")
    guntur = get_weather_for_coordinates(16.3067, 80.4365, db, past_days=7, forecast_days=2)
    print(f"      ✓ Source     : {guntur['source']}")
    print(f"      ✓ Records    : {len(guntur['records'])} days")
    if guntur['records']:
        r = guntur['records'][-1]
        print(f"      ✓ Latest day : {r['date']} | Tmax={r['temp_max']}°C Rain={r['precipitation']}mm")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("Stage 3 backend is ready!")
    print("  → Real data flows: Open-Meteo API → SQLite cache → FastAPI endpoint")
    print("=" * 60)

finally:
    db.close()
