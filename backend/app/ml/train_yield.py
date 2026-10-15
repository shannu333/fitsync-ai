"""
Machine Learning Rice Yield Prediction Pipeline — Stage 6
==========================================================
Trains and evaluates regression models on official Andhra Pradesh historical agricultural
statistics from the Directorate of Economics and Statistics (DES India).

Models Trained:
  1. Multiple Linear Regression (Baseline)
  2. Random Forest Regressor (Ensemble Bagging)
  3. Gradient Boosting Regressor (Boosting / Sequential Ensembling)

Artifacts Produced:
  - yield_model.joblib : Best performing Scikit-learn Pipeline (Preprocessor + Estimator)
  - model_metrics.json : Verified validation metrics (MAE, RMSE, R²) for all candidates
"""

import os
import json
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ap_des_rice_yield.json")
MODEL_DIR = os.path.dirname(__file__)
MODEL_ARTIFACT_PATH = os.path.join(MODEL_DIR, "yield_model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.json")


def load_dataset() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"DES India dataset not found at {DATA_PATH}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    df = pd.DataFrame(data)
    print(f"Loaded {len(df)} historical Andhra Pradesh district yield records from DES India.")
    return df


def train_and_evaluate_models():
    df = load_dataset()

    feature_cols_num = ["rainfall_mm", "temp_max_c", "humidity_pct", "peak_ndvi", "area_hectares"]
    feature_cols_cat = ["district", "season", "soil_type", "irrigation_type"]
    target_col = "yield_tonnes_per_hectare"

    X = df[feature_cols_num + feature_cols_cat]
    y = df[target_col]

    # 80/20 train/test split with deterministic seed
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
    print(f"Dataset split: {len(X_train)} training records, {len(X_test)} validation holdout records.")

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), feature_cols_num),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), feature_cols_cat),
        ]
    )

    candidate_models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42),
    }

    metrics_summary = {}
    trained_pipelines = {}

    print("\n" + "=" * 65)
    print("MODEL VALIDATION EVALUATION (Official DES India AP Yield Data)")
    print("=" * 65)

    best_model_name = None
    best_r2 = -999.0

    for name, estimator in candidate_models.items():
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", estimator),
        ])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))

        # In kg/acre equivalent
        mae_kg_acre = mae * 404.686
        rmse_kg_acre = rmse * 404.686

        metrics_summary[name] = {
            "MAE_tonnes_ha": round(mae, 4),
            "RMSE_tonnes_ha": round(rmse, 4),
            "R2_Score": round(r2, 4),
            "MAE_kg_acre": round(mae_kg_acre, 1),
            "RMSE_kg_acre": round(rmse_kg_acre, 1),
            "accuracy_pct": round(max(0.0, min(100.0, (1.0 - (mae / y_test.mean())) * 100.0)), 2),
        }

        trained_pipelines[name] = pipeline

        print(f"\nModel: {name}")
        print(f"  MAE  : {mae:.4f} t/ha  ({mae_kg_acre:.1f} kg/acre)")
        print(f"  RMSE : {rmse:.4f} t/ha  ({rmse_kg_acre:.1f} kg/acre)")
        print(f"  R²   : {r2:.4f}")
        print(f"  Mean Accuracy: {metrics_summary[name]['accuracy_pct']}%")

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name

    print("\n" + "=" * 65)
    print(f"Selected Best Model: {best_model_name} (R² = {best_r2:.4f})")
    print("=" * 65)

    best_pipeline = trained_pipelines[best_model_name]

    # Save artifact
    joblib.dump(best_pipeline, MODEL_ARTIFACT_PATH)
    print(f"Saved trained model artifact to: {MODEL_ARTIFACT_PATH}")

    # Save metrics JSON
    metrics_export = {
        "best_model": best_model_name,
        "trained_date": pd.Timestamp.now().isoformat(),
        "dataset_source": "Directorate of Economics and Statistics (DES India)",
        "models": metrics_summary,
        "sample_size": len(df),
        "target_variable": "yield_tonnes_per_hectare",
        "units": {"tonnes_per_hectare": "t/ha", "kg_per_acre": "kg/acre"},
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_export, f, indent=2)

    print(f"Saved validation metrics to: {METRICS_PATH}")
    return metrics_export


if __name__ == "__main__":
    train_and_evaluate_models()
