"""
Pydantic schemas for Sentinel-2 Satellite Processing API — Stage 4
"""
from typing import Optional, List
from pydantic import BaseModel


class SatelliteObservationRecord(BaseModel):
    id: Optional[int] = None
    granule_id: str
    tile_id: Optional[str] = None
    platform: str = "SENTINEL-2"
    observation_date: str
    cloud_coverage_pct: float
    is_cloud_masked: bool
    b03_green: Optional[float] = None
    b04_red: Optional[float] = None
    b08_nir: Optional[float] = None
    b11_swir: Optional[float] = None
    ndvi: Optional[float] = None
    ndmi: Optional[float] = None
    ndwi: Optional[float] = None
    health_status: str
    data_source: str = "Copernicus CDSE"


class SatelliteSummaryStats(BaseModel):
    latest_ndvi: Optional[float] = None
    latest_ndmi: Optional[float] = None
    latest_ndwi: Optional[float] = None
    latest_observation_date: Optional[str] = None
    latest_tile_id: Optional[str] = None
    health_status: Optional[str] = None
    ndvi_trend_30d: Optional[float] = None
    total_acquisitions: int = 0
    cloud_free_acquisitions: int = 0
    cloud_masked_acquisitions: int = 0


class SatelliteHistoryResponse(BaseModel):
    farm_id: Optional[int] = None
    lat: float
    lng: float
    records: List[SatelliteObservationRecord]
    summary: SatelliteSummaryStats
    source: str
    cache_hit: bool
    satellite: str = "Sentinel-2 (Copernicus Data Space Ecosystem)"
    api_error: Optional[str] = None
