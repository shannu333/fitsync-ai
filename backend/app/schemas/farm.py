from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class FarmBase(BaseModel):
    farm_name: str = Field(default="Main Rice Plot", description="Farm identifier name")
    crop_type: str = Field(default="Rice (వరి)", description="Crop type")
    variety: Optional[str] = Field(default="BPT 5204 (Samba Mahsuri)", description="Rice variety")
    area_acres: float = Field(..., gt=0, description="Farm area in acres")
    area_cents: Optional[float] = Field(default=0.0, ge=0, description="Additional area in cents")
    field_survey_number: Optional[str] = Field(default=None, description="AP Land Survey Number")
    latitude: Optional[float] = Field(default=None, description="GPS Latitude")
    longitude: Optional[float] = Field(default=None, description="GPS Longitude")
    boundary_points: Optional[str] = Field(default=None, description="JSON array of polygon coordinates")
    sowing_date: date = Field(..., description="Date of sowing or transplanting")
    soil_type: Optional[str] = Field(default=None, description="Soil classification")
    irrigation_source: Optional[str] = Field(default=None, description="Primary irrigation source")

class FarmCreate(FarmBase):
    pass

class FarmUpdate(BaseModel):
    farm_name: Optional[str] = None
    variety: Optional[str] = None
    area_acres: Optional[float] = Field(default=None, gt=0)
    area_cents: Optional[float] = Field(default=None, ge=0)
    field_survey_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_points: Optional[str] = None
    sowing_date: Optional[date] = None
    soil_type: Optional[str] = None
    irrigation_source: Optional[str] = None

class FarmResponse(FarmBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- STAGE 2 ANALYTICS SCHEMAS -----------------

class CropHealthStressData(BaseModel):
    health_score: int = Field(..., ge=0, le=100, description="Overall health score (0-100)")
    stress_level: str = Field(..., description="Low, Moderate, High, or Very High")
    stress_level_te: str = Field(..., description="Telugu translation of stress level")
    stress_color: str = Field(..., description="Hex or Tailwind color code")
    growth_stage: str = Field(..., description="Current phenological rice stage")
    growth_stage_te: str = Field(..., description="Telugu growth stage")
    days_since_sowing: int = Field(..., ge=0)
    stress_breakdown: Dict[str, int] = Field(..., description="Percentages for Water, Nutrient, Pest, Heat")
    primary_stress_factor: str
    primary_stress_factor_te: str
    recommendations: List[str]
    recommendations_te: List[str]

class WeatherSummaryData(BaseModel):
    temperature_c: float
    feels_like_c: float
    humidity_pct: int
    rainfall_mm_last_7d: float
    rainfall_forecast_next_3d_pct: int
    condition: str
    condition_te: str
    wind_speed_kmh: float
    heat_index: str
    evapotranspiration_mm: float
    irrigation_advice: str
    irrigation_advice_te: str
    forecast: List[Dict[str, Any]]

class SatelliteObservationData(BaseModel):
    ndvi_current: float = Field(..., description="Normalized Difference Vegetation Index (0.0 to 1.0)")
    ndvi_previous: float
    ndvi_trend: str  # "improving", "stable", "declining"
    ndwi_moisture: float = Field(..., description="Normalized Difference Water Index")
    vegetation_vigor: str
    vegetation_vigor_te: str
    canopy_cover_pct: int
    cloud_cover_pct: float
    last_satellite_pass: str
    next_pass_estimate: str
    satellite_sensor: str = "Sentinel-2 MultiSpectral MSI"
    resolution: str = "10m Ground Sample"

class YieldPredictionData(BaseModel):
    predicted_yield_quintals_per_acre: float
    predicted_bags_per_acre: int  # 75 kg paddy bag standard in AP
    total_expected_bags: int
    ap_district_benchmark_quintals: float
    deviation_pct: float
    yield_trend: str  # "above_average", "normal", "risk_of_drop"
    expected_harvest_date: str
    msp_price_per_quintal_inr: float = 2320.0  # AP Govt MSP for paddy
    estimated_gross_revenue_inr: float
    potential_loss_risk_pct: float
    agronomic_advisory: str
    agronomic_advisory_te: str

class FarmAnalyticsResponse(BaseModel):
    farm_id: int
    farm_name: str
    district: str
    mandal: str
    village: str
    variety: str
    area_acres: float
    sowing_date: date
    crop_health: CropHealthStressData
    weather: WeatherSummaryData
    satellite: SatelliteObservationData
    yield_prediction: YieldPredictionData
    generated_at: datetime
