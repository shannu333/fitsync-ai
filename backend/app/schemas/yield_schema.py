"""
Pydantic schemas for Machine Learning Yield Prediction & Farmer Recommendations — Stage 6
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class PredictionMetrics(BaseModel):
    tonnes_per_hectare: float
    tonnes_per_hectare_range: List[float]
    kg_per_acre: float
    kg_per_acre_range: List[float]
    total_plot_tonnes: float
    total_75kg_bags: float
    total_75kg_bags_range: List[float]
    confidence_interval: str = "90% Empirical Prediction Interval"


class RegionalComparison(BaseModel):
    district_benchmark_t_ha: float
    performance_delta_pct: float
    status: str
    status_te: str


class FarmerRecommendationItem(BaseModel):
    category: str
    icon: str
    title: str
    title_te: str
    action: str
    action_te: str
    cost_benefit: str
    cost_benefit_te: str


class FarmYieldPredictionResponse(BaseModel):
    farm_id: int
    farm_name: str
    district: str
    season: str
    area_acres: float
    area_hectares: float
    variety: str
    model_used: str
    r2_score: float
    validation_rmse_t_ha: float
    prediction: PredictionMetrics
    regional_comparison: RegionalComparison
    features_used: Dict[str, Any]
    recommendations: List[FarmerRecommendationItem]


class CustomYieldPredictionRequest(BaseModel):
    district: str
    season: str = "Kharif"
    area_acres: float = 2.5
    peak_ndvi: float = 0.68
    seasonal_rainfall_mm: float = 950.0
    mean_temp_max_c: float = 32.5
    humidity_pct: float = 80.0
    soil_type: str = "Alluvial Delta"
    irrigation_type: str = "Canal Delta"
