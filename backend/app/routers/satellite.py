"""
Satellite Router — Stage 4
===========================
GET /api/v1/satellite/farm/{farm_id}  — Returns historical Sentinel-2 observations, spectral indices (NDVI, NDMI, NDWI), and cloud masks
GET /api/v1/satellite/coordinates     — Returns satellite telemetry for given latitude/longitude coordinates
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.satellite import (
    SatelliteHistoryResponse,
    SatelliteObservationRecord,
    SatelliteSummaryStats,
)
from app.services.satellite import get_satellite_history_for_coordinates
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/satellite", tags=["Satellite"])


@router.get("/farm/{farm_id}", response_model=SatelliteHistoryResponse)
def get_farm_satellite_data(
    farm_id: int,
    past_days: int = Query(default=90, ge=15, le=180, description="Past window in days to search Sentinel-2 scenes"),
    cloud_threshold: float = Query(default=25.0, ge=5.0, le=80.0, description="Max cloud coverage percentage for valid observation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch Sentinel-2 L2A satellite time series from Copernicus Data Space Ecosystem
    for the farmer's registered plot.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")

    lat, lng = _resolve_farm_coordinates(farm)
    if lat is None or lng is None:
        raise HTTPException(
            status_code=422,
            detail="Farm has no location coordinates. Please set farm location in the map picker."
        )

    sat_data = get_satellite_history_for_coordinates(
        lat=lat,
        lng=lng,
        db=db,
        farm_id=farm_id,
        past_days=past_days,
        cloud_threshold=cloud_threshold,
    )

    records = [SatelliteObservationRecord(**r) for r in sat_data.get("records", [])]
    summary = SatelliteSummaryStats(**sat_data.get("summary", {}))

    return SatelliteHistoryResponse(
        farm_id=farm_id,
        lat=sat_data["lat"],
        lng=sat_data["lng"],
        records=records,
        summary=summary,
        source=sat_data["source"],
        cache_hit=sat_data["cache_hit"],
        satellite=sat_data["satellite"],
        api_error=sat_data.get("api_error"),
    )


@router.get("/coordinates", response_model=SatelliteHistoryResponse)
def get_satellite_by_coordinates(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    past_days: int = Query(default=90, ge=15, le=180),
    cloud_threshold: float = Query(default=25.0, ge=5.0, le=80.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Query Copernicus Sentinel-2 observations for direct GPS coordinates.
    """
    sat_data = get_satellite_history_for_coordinates(
        lat=lat,
        lng=lng,
        db=db,
        farm_id=None,
        past_days=past_days,
        cloud_threshold=cloud_threshold,
    )

    records = [SatelliteObservationRecord(**r) for r in sat_data.get("records", [])]
    summary = SatelliteSummaryStats(**sat_data.get("summary", {}))

    return SatelliteHistoryResponse(
        farm_id=None,
        lat=sat_data["lat"],
        lng=sat_data["lng"],
        records=records,
        summary=summary,
        source=sat_data["source"],
        cache_hit=sat_data["cache_hit"],
        satellite=sat_data["satellite"],
        api_error=sat_data.get("api_error"),
    )


def _resolve_farm_coordinates(farm: Farm) -> tuple[Optional[float], Optional[float]]:
    lat = getattr(farm, "latitude", None)
    lng = getattr(farm, "longitude", None)
    if lat is not None and lng is not None:
        return float(lat), float(lng)

    try:
        import json
        boundary = farm.boundary_points
        if isinstance(boundary, str):
            boundary = json.loads(boundary)
        if boundary and isinstance(boundary, list) and len(boundary) > 0:
            first = boundary[0]
            if isinstance(first, (list, tuple)) and len(first) >= 2:
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
