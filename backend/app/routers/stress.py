"""
Crop Stress Assessment Router — Stage 5
========================================
GET /api/v1/stress/farm/{farm_id}  — Evaluates real satellite & weather telemetry to diagnose early crop stress
POST /api/v1/stress/simulate       — Simulates environmental scenarios (drought, heatwave, waterlogging)
GET /api/v1/stress/coordinates     — Evaluates stress for given coordinates
"""
import logging
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.stress import (
    StressAssessmentResponse,
    StressSimulationRequest,
    StressFactorDetail,
    WeatherSummaryMetrics,
    SpectralSummaryMetrics,
)
from app.services.stress_engine import evaluate_crop_stress, run_rule_inference
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stress", tags=["Crop Stress"])


@router.get("/farm/{farm_id}", response_model=StressAssessmentResponse)
def get_farm_stress_assessment(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Diagnose early crop stress for a farmer's plot by correlating Copernicus Sentinel-2
    vegetation indices (NDVI/NDMI/NDWI) with real Open-Meteo meteorological anomalies.
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

    assessment = evaluate_crop_stress(
        lat=lat,
        lng=lng,
        db=db,
        farm_id=farm_id,
        sowing_date=farm.sowing_date,
    )

    return _build_response_object(assessment, lat, lng, farm_id)


@router.get("/coordinates", response_model=StressAssessmentResponse)
def get_coordinate_stress_assessment(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate crop stress for raw GPS coordinates.
    """
    assessment = evaluate_crop_stress(lat=lat, lng=lng, db=db, farm_id=None)
    return _build_response_object(assessment, lat, lng, None)


@router.post("/simulate", response_model=StressAssessmentResponse)
def simulate_stress_scenario(
    req: StressSimulationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Simulates specific environmental shock scenarios (drought, heatwave, waterlogging, optimal)
    to verify rule engine inference and agronomic logic.
    """
    scenario = req.scenario.lower()
    lat = req.lat or 16.9890
    lng = req.lng or 81.7840

    sat_records, sat_summary, weather_records, weather_summary = _generate_scenario_data(scenario)

    assessment = run_rule_inference(
        sat_records=sat_records,
        sat_summary=sat_summary,
        weather_records=weather_records,
        weather_summary=weather_summary,
        lat=lat,
        lng=lng,
    )

    return _build_response_object(assessment, lat, lng, None)


def _build_response_object(assessment: dict, lat: float, lng: float, farm_id: Optional[int]) -> StressAssessmentResponse:
    factors = [StressFactorDetail(**f) for f in assessment.get("factors", [])]
    weather_summary = WeatherSummaryMetrics(**assessment.get("weather_summary", {}))
    spectral_summary = SpectralSummaryMetrics(**assessment.get("spectral_summary", {}))

    return StressAssessmentResponse(
        farm_id=farm_id,
        lat=lat,
        lng=lng,
        overall_risk_score=assessment["overall_risk_score"],
        risk_level=assessment["risk_level"],
        risk_level_te=assessment["risk_level_te"],
        primary_cause=assessment["primary_cause"],
        primary_cause_te=assessment["primary_cause_te"],
        confidence_pct=assessment["confidence_pct"],
        factors=factors,
        diagnosed_at=assessment["diagnosed_at"],
        satellite_timestamp=assessment["satellite_timestamp"],
        weather_summary=weather_summary,
        spectral_summary=spectral_summary,
        recommendations=assessment["recommendations"],
        recommendations_te=assessment["recommendations_te"],
        disclaimer=assessment["disclaimer"],
        disclaimer_te=assessment["disclaimer_te"],
    )


def _generate_scenario_data(scenario: str):
    """Generates synthetic test vectors for scenario simulation."""
    today = date.today()
    base_dates = [(today - timedelta(days=i)).isoformat() for i in range(30, -1, -1)]

    if scenario == "drought":
        # Low NDMI, 0 rainfall for 14 days, normal-high temp
        sat_records = [{
            "observation_date": datetime.utcnow().isoformat(),
            "ndvi": 0.42,
            "ndmi": 0.11,
            "ndwi": -0.22,
            "is_cloud_masked": False,
        }]
        sat_summary = {"ndvi_trend_30d": -0.07}
        weather_records = [
            {"date": d, "temp_max": 33.5, "temp_min": 24.0, "precipitation": 0.0, "humidity": 48.0, "solar_radiation": 20.0}
            for d in base_dates
        ]
        weather_summary = {"total_rainfall_mm": 2.0}

    elif scenario == "heatwave":
        # Critical temperatures >38°C, high solar radiation, falling NDVI
        sat_records = [{
            "observation_date": datetime.utcnow().isoformat(),
            "ndvi": 0.48,
            "ndmi": 0.22,
            "ndwi": -0.10,
            "is_cloud_masked": False,
        }]
        sat_summary = {"ndvi_trend_30d": -0.05}
        weather_records = [
            {"date": d, "temp_max": 39.2, "temp_min": 27.5, "precipitation": 0.0, "humidity": 52.0, "solar_radiation": 23.5}
            for d in base_dates
        ]
        weather_summary = {"total_rainfall_mm": 15.0}

    elif scenario == "waterlogging":
        # Heavy rain surge (140mm), elevated NDWI
        sat_records = [{
            "observation_date": datetime.utcnow().isoformat(),
            "ndvi": 0.54,
            "ndmi": 0.35,
            "ndwi": 0.16,
            "is_cloud_masked": False,
        }]
        sat_summary = {"ndvi_trend_30d": 0.01}
        weather_records = []
        for i, d in enumerate(base_dates):
            precip = 35.0 if i >= len(base_dates) - 4 else 2.0
            weather_records.append({
                "date": d,
                "temp_max": 28.5,
                "temp_min": 23.0,
                "precipitation": precip,
                "humidity": 92.0,
                "solar_radiation": 12.0,
            })
        weather_summary = {"total_rainfall_mm": 155.0}

    else:  # optimal
        sat_records = [{
            "observation_date": datetime.utcnow().isoformat(),
            "ndvi": 0.68,
            "ndmi": 0.32,
            "ndwi": -0.05,
            "is_cloud_masked": False,
        }]
        sat_summary = {"ndvi_trend_30d": 0.04}
        weather_records = [
            {"date": d, "temp_max": 30.5, "temp_min": 23.5, "precipitation": 5.0 if i % 4 == 0 else 0.0, "humidity": 78.0, "solar_radiation": 18.0}
            for i, d in enumerate(base_dates)
        ]
        weather_summary = {"total_rainfall_mm": 45.0}

    return sat_records, sat_summary, weather_records, weather_summary


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
