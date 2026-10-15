"""
Pydantic schemas for Weather API responses — Stage 3
"""
from typing import Optional, List
from pydantic import BaseModel


class WeatherDayRecord(BaseModel):
    """Single day's weather observation or forecast."""
    date: str               # ISO format: "2025-10-14"
    temp_max: Optional[float] = None      # °C
    temp_min: Optional[float] = None      # °C
    precipitation: Optional[float] = None  # mm
    solar_radiation: Optional[float] = None  # MJ/m²
    humidity: Optional[float] = None      # %


class WeatherSummaryStats(BaseModel):
    """Aggregate stats computed over the fetched window."""
    avg_temp_max: Optional[float] = None
    avg_temp_min: Optional[float] = None
    avg_temp: Optional[float] = None
    total_rainfall_mm: Optional[float] = None
    avg_daily_rainfall_mm: Optional[float] = None
    avg_solar_radiation: Optional[float] = None
    avg_humidity: Optional[float] = None
    rainy_days: Optional[int] = None
    record_count: Optional[int] = None


class WeatherHistoryResponse(BaseModel):
    """Full weather response returned by /api/v1/weather/farm/{farm_id}."""
    farm_id: int
    lat: float
    lng: float
    past_days: int
    forecast_days: int
    records: List[WeatherDayRecord]
    summary: WeatherSummaryStats
    source: str        # "cache" | "api" | "api+cache" | "stale_cache" | "error"
    cache_hit: bool
    api_error: Optional[str] = None
    data_provider: str = "Open-Meteo (https://open-meteo.com/)"
