"""
Pydantic schemas for Crop Stress Assessment API — Stage 5
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class StressFactorDetail(BaseModel):
    factor: str
    factor_te: str
    score: float
    severity: str
    reasoning: str
    reasoning_te: str


class WeatherSummaryMetrics(BaseModel):
    rain_7d_mm: float
    rain_14d_mm: float
    consecutive_dry_days: int
    max_temp_c: float
    avg_temp_c: float
    avg_humidity_pct: float
    avg_solar_radiation: float


class SpectralSummaryMetrics(BaseModel):
    latest_ndvi: float
    latest_ndmi: float
    latest_ndwi: float
    delta_ndvi_30d: float
    is_cloud_masked: bool


class StressAssessmentResponse(BaseModel):
    farm_id: Optional[int] = None
    lat: float
    lng: float
    overall_risk_score: float
    risk_level: str
    risk_level_te: str
    primary_cause: str
    primary_cause_te: str
    confidence_pct: float
    factors: List[StressFactorDetail]
    diagnosed_at: str
    satellite_timestamp: str
    weather_summary: WeatherSummaryMetrics
    spectral_summary: SpectralSummaryMetrics
    recommendations: List[str]
    recommendations_te: List[str]
    disclaimer: str
    disclaimer_te: str


class StressSimulationRequest(BaseModel):
    scenario: str  # "drought" | "heatwave" | "waterlogging" | "optimal"
    lat: Optional[float] = 16.9890
    lng: Optional[float] = 81.7840
