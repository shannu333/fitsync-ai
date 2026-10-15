"""
Weather Router — Stage 3
========================
GET /api/v1/weather/farm/{farm_id}  — returns 30-day history + 3-day forecast
GET /api/v1/weather/coordinates     — returns weather for raw lat/lng (for testing)
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.weather import WeatherHistoryResponse, WeatherDayRecord, WeatherSummaryStats
from app.services.weather import get_weather_for_coordinates
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/farm/{farm_id}", response_model=WeatherHistoryResponse)
def get_farm_weather(
    farm_id: int,
    past_days: int = Query(default=30, ge=1, le=90, description="Number of past days to fetch (1–90)"),
    forecast_days: int = Query(default=3, ge=0, le=7, description="Number of forecast days (0–7)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch real daily weather data for a specific farm.

    - Uses the farm's stored latitude/longitude (centroid of boundary_points, or lat/lng fields).
    - Calls Open-Meteo API if cache is stale; returns cached data otherwise.
    - Data sourced from Open-Meteo (free, no API key, CC BY 4.0 license).
    """
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")

    # Resolve coordinates from farm record
    lat, lng = _resolve_farm_coordinates(farm)
    if lat is None or lng is None:
        raise HTTPException(
            status_code=422,
            detail="Farm has no location coordinates. Please set farm location in the map picker."
        )

    weather_data = get_weather_for_coordinates(
        lat=lat,
        lng=lng,
        db=db,
        past_days=past_days,
        forecast_days=forecast_days,
    )

    # Build validated response
    records = [WeatherDayRecord(**r) for r in weather_data["records"]]
    summary = WeatherSummaryStats(**weather_data.get("summary", {}))

    return WeatherHistoryResponse(
        farm_id=farm_id,
        lat=weather_data["lat"],
        lng=weather_data["lng"],
        past_days=past_days,
        forecast_days=forecast_days,
        records=records,
        summary=summary,
        source=weather_data["source"],
        cache_hit=weather_data["cache_hit"],
        api_error=weather_data.get("api_error"),
    )


@router.get("/coordinates", response_model=WeatherHistoryResponse)
def get_weather_by_coordinates(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    past_days: int = Query(default=30, ge=1, le=90),
    forecast_days: int = Query(default=3, ge=0, le=7),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch weather for raw coordinates — useful for testing or new farm location preview.
    Requires authentication.
    """
    weather_data = get_weather_for_coordinates(
        lat=lat,
        lng=lng,
        db=db,
        past_days=past_days,
        forecast_days=forecast_days,
    )

    records = [WeatherDayRecord(**r) for r in weather_data["records"]]
    summary = WeatherSummaryStats(**weather_data.get("summary", {}))

    return WeatherHistoryResponse(
        farm_id=0,  # N/A for coordinate-based lookup
        lat=weather_data["lat"],
        lng=weather_data["lng"],
        past_days=past_days,
        forecast_days=forecast_days,
        records=records,
        summary=summary,
        source=weather_data["source"],
        cache_hit=weather_data["cache_hit"],
        api_error=weather_data.get("api_error"),
    )


def _resolve_farm_coordinates(farm: Farm) -> tuple[Optional[float], Optional[float]]:
    """
    Extract lat/lng from the farm model.

    Priority:
    1. farm.latitude / farm.longitude  (direct columns, if present)
    2. Centroid of farm.boundary_points (GeoJSON-style list of [lng, lat] pairs)
    """
    # Try direct coordinate columns first
    lat = getattr(farm, "latitude", None)
    lng = getattr(farm, "longitude", None)
    if lat is not None and lng is not None:
        return float(lat), float(lng)

    # Try to compute centroid from boundary_points
    try:
        import json
        boundary = farm.boundary_points
        if isinstance(boundary, str):
            boundary = json.loads(boundary)
        if boundary and isinstance(boundary, list) and len(boundary) > 0:
            # Handle both [lng, lat] pairs and {"lat": ..., "lng": ...} dicts
            first = boundary[0]
            if isinstance(first, (list, tuple)) and len(first) >= 2:
                # [lng, lat] pairs (GeoJSON convention)
                lats = [p[1] for p in boundary]
                lngs = [p[0] for p in boundary]
            elif isinstance(first, dict):
                lats = [p.get("lat", p.get("latitude")) for p in boundary if p.get("lat") or p.get("latitude")]
                lngs = [p.get("lng", p.get("longitude")) for p in boundary if p.get("lng") or p.get("longitude")]
            else:
                return None, None

            if lats and lngs:
                return sum(lats) / len(lats), sum(lngs) / len(lngs)
    except Exception as e:
        logger.warning(f"Could not parse boundary_points for farm {farm.id}: {e}")

    return None, None
