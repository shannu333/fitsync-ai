"""
Rice Yield Prediction Router — Stage 6
======================================
GET /api/v1/yield/farm/{farm_id}    — Predicts yield and generates non-pesticide recommendations
GET /api/v1/yield/model-metrics     — Returns verified validation metrics (MAE, RMSE, R²) for all models
POST /api/v1/yield/predict-custom   — Interactive yield prediction tool
"""
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.yield_schema import (
    FarmYieldPredictionResponse,
    CustomYieldPredictionRequest,
)
from app.services.yield_predictor import (
    predict_farm_yield,
    load_model_metrics,
    load_trained_model,
    KG_PER_ACRE_CONVERSION,
    BAG_WEIGHT_KG,
)
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/yield", tags=["Yield Prediction"])


@router.get("/farm/{farm_id}", response_model=FarmYieldPredictionResponse)
def get_farm_yield_prediction(
    farm_id: int,
    season: Optional[str] = Query(None, description="Optional override: 'Kharif' or 'Rabi'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate Machine Learning yield prediction and non-pesticide recommendations
    for a specific farmer's plot based on DES India trained model, Copernicus NDVI, and Open-Meteo climate.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")

    res = predict_farm_yield(farm=farm, db=db, custom_season=season)
    return FarmYieldPredictionResponse(**res)


@router.get("/model-metrics")
def get_model_validation_metrics(
    current_user: User = Depends(get_current_user),
):
    """
    Returns actual validation metrics (MAE, RMSE, R², accuracy) across Linear Regression,
    Random Forest, and Gradient Boosting Regressor trained on DES India AP statistics.
    """
    return load_model_metrics()


@router.post("/predict-custom")
def predict_custom_yield(
    req: CustomYieldPredictionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Simulate yield prediction for custom Andhra Pradesh scenario parameters.
    """
    model = load_trained_model()
    metrics = load_model_metrics()
    best_model_name = metrics.get("best_model", "Gradient Boosting Regressor")
    rmse_tonnes_ha = metrics.get("models", {}).get(best_model_name, {}).get("RMSE_tonnes_ha", 0.0768)

    area_ha = req.area_acres * 0.404686
    input_data = pd.DataFrame([{
        "rainfall_mm": req.seasonal_rainfall_mm,
        "temp_max_c": req.mean_temp_max_c,
        "humidity_pct": req.humidity_pct,
        "peak_ndvi": req.peak_ndvi,
        "area_hectares": area_ha,
        "district": req.district,
        "season": req.season,
        "soil_type": req.soil_type,
        "irrigation_type": req.irrigation_type,
    }])

    pred_tonnes_ha = float(model.predict(input_data)[0])
    margin = 1.645 * rmse_tonnes_ha
    lower_t_ha = round(max(1.0, pred_tonnes_ha - margin), 2)
    upper_t_ha = round(pred_tonnes_ha + margin, 2)
    pred_tonnes_ha = round(pred_tonnes_ha, 2)

    kg_acre = round(pred_tonnes_ha * KG_PER_ACRE_CONVERSION, 1)
    total_bags = round((kg_acre * req.area_acres) / BAG_WEIGHT_KG, 1)

    return {
        "district": req.district,
        "season": req.season,
        "area_acres": req.area_acres,
        "predicted_tonnes_per_hectare": pred_tonnes_ha,
        "tonnes_per_hectare_range": [lower_t_ha, upper_t_ha],
        "predicted_kg_per_acre": kg_acre,
        "total_75kg_bags": total_bags,
        "model_used": best_model_name,
        "confidence": "90% Empirical Prediction Interval",
    }
