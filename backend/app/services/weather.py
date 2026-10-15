"""
Weather Service — Stage 3: Real Weather Data Integration
=========================================================
Fetches daily weather variables from Open-Meteo API for given farm coordinates
and caches results in SQLite to avoid redundant API calls.

Variables fetched:
- temperature_2m_max   → temp_max  (°C)
- temperature_2m_min   → temp_min  (°C)
- precipitation_sum    → precipitation (mm)
- shortwave_radiation_sum → solar_radiation (MJ/m²)
- relative_humidity_2m_mean → humidity (%)

Cache logic:
- Coordinates are rounded to 2 decimal places before lookup/store
- A cached record is considered fresh if fetched_at < CACHE_TTL_HOURS ago
- If ALL required dates are cached and fresh → return from cache
- Otherwise → call Open-Meteo, upsert results, return combined data
"""

import math
import logging
from datetime import datetime, date, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.weather_cache import WeatherCache

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_HOURS = 6
COORDINATE_PRECISION = 2  # decimal places for grouping nearby coords

DAILY_VARIABLES = ",".join([
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "shortwave_radiation_sum",
    "relative_humidity_2m_mean",
])


def _round_coord(value: float) -> float:
    """Round a coordinate to COORDINATE_PRECISION decimal places."""
    return round(value, COORDINATE_PRECISION)


def _is_fresh(fetched_at: datetime) -> bool:
    """Return True if the cached row was fetched within the TTL window."""
    age = datetime.utcnow() - fetched_at
    return age.total_seconds() < CACHE_TTL_HOURS * 3600


def _fetch_from_open_meteo(lat: float, lng: float, past_days: int = 30, forecast_days: int = 3) -> dict:
    """
    Call Open-Meteo API and return the raw JSON response.
    Raises httpx.HTTPError on network/HTTP failures.
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": DAILY_VARIABLES,
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": "Asia/Kolkata",
    }
    logger.info(f"Calling Open-Meteo API: lat={lat}, lng={lng}, past_days={past_days}")
    with httpx.Client(timeout=15.0) as client:
        response = client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
    return response.json()


def _parse_open_meteo_response(data: dict) -> list[dict]:
    """
    Parse the Open-Meteo JSON response into a list of day records.

    Returns:
        List of dicts: {date, temp_max, temp_min, precipitation, solar_radiation, humidity}
    """
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    temp_max_vals = daily.get("temperature_2m_max", [])
    temp_min_vals = daily.get("temperature_2m_min", [])
    precip_vals = daily.get("precipitation_sum", [])
    solar_vals = daily.get("shortwave_radiation_sum", [])
    humidity_vals = daily.get("relative_humidity_2m_mean", [])

    records = []
    for i, date_str in enumerate(dates):
        records.append({
            "date": date.fromisoformat(date_str),
            "temp_max": temp_max_vals[i] if i < len(temp_max_vals) else None,
            "temp_min": temp_min_vals[i] if i < len(temp_min_vals) else None,
            "precipitation": precip_vals[i] if i < len(precip_vals) else None,
            "solar_radiation": solar_vals[i] if i < len(solar_vals) else None,
            "humidity": humidity_vals[i] if i < len(humidity_vals) else None,
        })
    return records


def _upsert_to_cache(db: Session, lat: float, lng: float, records: list[dict]) -> None:
    """
    Insert or update weather records in the SQLite cache.
    Uses a simple lookup-then-insert/update approach for SQLite compatibility.
    """
    now = datetime.utcnow()
    for rec in records:
        existing = db.query(WeatherCache).filter(
            and_(
                WeatherCache.lat == lat,
                WeatherCache.lng == lng,
                WeatherCache.obs_date == rec["date"],
            )
        ).first()

        if existing:
            existing.temp_max = rec["temp_max"]
            existing.temp_min = rec["temp_min"]
            existing.precipitation = rec["precipitation"]
            existing.solar_radiation = rec["solar_radiation"]
            existing.humidity = rec["humidity"]
            existing.fetched_at = now
        else:
            db.add(WeatherCache(
                lat=lat,
                lng=lng,
                obs_date=rec["date"],
                temp_max=rec["temp_max"],
                temp_min=rec["temp_min"],
                precipitation=rec["precipitation"],
                solar_radiation=rec["solar_radiation"],
                humidity=rec["humidity"],
                source="open-meteo",
                fetched_at=now,
            ))
    db.commit()
    logger.info(f"Upserted {len(records)} weather records to cache for lat={lat}, lng={lng}")


def _query_cache(db: Session, lat: float, lng: float, start_date: date, end_date: date) -> list[WeatherCache]:
    """Fetch cached rows in [start_date, end_date] for given coordinates."""
    return (
        db.query(WeatherCache)
        .filter(
            and_(
                WeatherCache.lat == lat,
                WeatherCache.lng == lng,
                WeatherCache.obs_date >= start_date,
                WeatherCache.obs_date <= end_date,
            )
        )
        .order_by(WeatherCache.obs_date)
        .all()
    )


def _rows_to_dict_list(rows: list[WeatherCache]) -> list[dict]:
    return [
        {
            "date": row.obs_date.isoformat(),
            "temp_max": row.temp_max,
            "temp_min": row.temp_min,
            "precipitation": row.precipitation,
            "solar_radiation": row.solar_radiation,
            "humidity": row.humidity,
        }
        for row in rows
    ]


def _compute_summary(records: list[dict]) -> dict:
    """Compute aggregate stats from a list of daily records."""
    valid_tmax = [r["temp_max"] for r in records if r["temp_max"] is not None]
    valid_tmin = [r["temp_min"] for r in records if r["temp_min"] is not None]
    valid_rain = [r["precipitation"] for r in records if r["precipitation"] is not None]
    valid_solar = [r["solar_radiation"] for r in records if r["solar_radiation"] is not None]
    valid_humid = [r["humidity"] for r in records if r["humidity"] is not None]

    def safe_avg(lst):
        return round(sum(lst) / len(lst), 1) if lst else None

    return {
        "avg_temp_max": safe_avg(valid_tmax),
        "avg_temp_min": safe_avg(valid_tmin),
        "avg_temp": safe_avg([(h + l) / 2 for h, l in zip(valid_tmax, valid_tmin)]) if valid_tmax and valid_tmin else None,
        "total_rainfall_mm": round(sum(valid_rain), 1) if valid_rain else None,
        "avg_daily_rainfall_mm": safe_avg(valid_rain),
        "avg_solar_radiation": safe_avg(valid_solar),
        "avg_humidity": safe_avg(valid_humid),
        "rainy_days": len([r for r in valid_rain if r > 1.0]),
        "record_count": len(records),
    }


def get_weather_for_coordinates(
    lat: float,
    lng: float,
    db: Session,
    past_days: int = 30,
    forecast_days: int = 3,
) -> dict:
    """
    Main entry point: return weather history + forecast for (lat, lng).

    Flow:
    1. Round coordinates to COORDINATE_PRECISION
    2. Check cache for the requested date range
    3. If cache is complete AND fresh (all days present, fetched_at < TTL) → return cache
    4. Otherwise → call Open-Meteo API, upsert results, return data

    Returns:
        {
          "records": [...],     # list of daily dicts
          "summary": {...},     # aggregate stats
          "source": str,        # "cache" | "api" | "api+cache"
          "cache_hit": bool,
          "lat": float,
          "lng": float,
          "past_days": int,
          "forecast_days": int,
        }
    """
    rlat = _round_coord(lat)
    rlng = _round_coord(lng)

    today = date.today()
    start_date = today - timedelta(days=past_days)
    end_date = today + timedelta(days=max(0, forecast_days - 1)) if forecast_days > 0 else today

    # Step 1: Check cache
    cached_rows = _query_cache(db, rlat, rlng, start_date, end_date)
    expected_days = (end_date - start_date).days + 1
    cache_complete = len(cached_rows) >= expected_days
    cache_fresh = all(_is_fresh(row.fetched_at) for row in cached_rows) if cached_rows else False

    if cache_complete and cache_fresh:
        logger.info(f"Cache HIT for lat={rlat}, lng={rlng} ({len(cached_rows)} rows)")
        records = _rows_to_dict_list(cached_rows)
        return {
            "records": records,
            "summary": _compute_summary(records),
            "source": "cache",
            "cache_hit": True,
            "lat": rlat,
            "lng": rlng,
            "past_days": past_days,
            "forecast_days": forecast_days,
        }

    # Step 2: Fetch from Open-Meteo API
    api_error: Optional[str] = None
    try:
        raw = _fetch_from_open_meteo(rlat, rlng, past_days=past_days, forecast_days=forecast_days)
        parsed = _parse_open_meteo_response(raw)
        _upsert_to_cache(db, rlat, rlng, parsed)
        source = "api" if not cached_rows else "api+cache"
    except httpx.HTTPStatusError as e:
        logger.error(f"Open-Meteo HTTP error: {e.response.status_code} — {e.response.text[:200]}")
        api_error = f"HTTP {e.response.status_code}"
    except httpx.TimeoutException:
        logger.error("Open-Meteo API timed out")
        api_error = "timeout"
    except Exception as e:
        logger.error(f"Open-Meteo unexpected error: {e}")
        api_error = str(e)

    if api_error and not cached_rows:
        # No cached data AND API failed — return empty with error flag
        return {
            "records": [],
            "summary": {},
            "source": "error",
            "cache_hit": False,
            "api_error": api_error,
            "lat": rlat,
            "lng": rlng,
            "past_days": past_days,
            "forecast_days": forecast_days,
        }

    # Re-query cache after successful upsert (or return stale cache if API failed)
    final_rows = _query_cache(db, rlat, rlng, start_date, end_date)
    records = _rows_to_dict_list(final_rows)

    result = {
        "records": records,
        "summary": _compute_summary(records),
        "source": source if not api_error else "stale_cache",
        "cache_hit": api_error is not None,
        "lat": rlat,
        "lng": rlng,
        "past_days": past_days,
        "forecast_days": forecast_days,
    }
    if api_error:
        result["api_error"] = api_error

    return result
