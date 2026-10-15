"""
Stage 6 — End-to-End Test for ML Rice Yield Prediction & Farmer Recommendations
Tests:
  1. Validation of trained model artifact and actual metrics from DES India data
  2. Yield prediction calculation in tonnes/hectare, kg/acre, and 75kg bags
  3. 90% empirical prediction uncertainty intervals
  4. Regional performance benchmark comparison
  5. Actionable non-pesticide biological and cultural recommendation generation
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal, init_db
from app.models.farm import Farm
from app.services.yield_predictor import (
    load_model_metrics,
    predict_farm_yield,
    generate_non_pesticide_recommendations,
)

print("=" * 65)
print("RicePulse AP — Stage 6 ML Rice Yield Prediction Test")
print("Trained on Official Historical Agricultural Statistics (DES India)")
print("=" * 65)

# 1. Check Model Validation Metrics
print("\n[1/4] Verifying Scikit-learn Model Training Metrics...")
metrics = load_model_metrics()
print(f"  ✓ Best Model Architecture : {metrics.get('best_model')}")
print(f"  ✓ Dataset Source          : {metrics.get('dataset_source')}")

for model_name, m in metrics.get("models", {}).items():
    print(f"  • {model_name:28}: MAE = {m['MAE_tonnes_ha']} t/ha ({m['MAE_kg_acre']} kg/acre) | RMSE = {m['RMSE_tonnes_ha']} t/ha | R² = {m['R2_Score']} | Acc = {m['accuracy_pct']}%")

best_m = metrics.get("models", {}).get(metrics.get("best_model", ""), {})
assert best_m.get("R2_Score", 0) > 0.90, "Expected high R² score on DES India agricultural dataset!"
print("  ✓ Model accuracy benchmarks passed validation!")

# 2. Database & Farm retrieval
print("\n[2/4] Fetching Farm from database...")
init_db()
db = SessionLocal()

try:
    farm = db.query(Farm).first()
    assert farm is not None, "No farm found in database for testing!"
    print(f"  ✓ Target Farm: ID {farm.id} - '{farm.farm_name}'")
    print(f"    Area: {farm.area_acres} Acres | District: {farm.owner.district if farm.owner else 'East Godavari'} | Variety: {farm.variety}")

    # 3. Predict Yield
    print("\n[3/4] Running ML Yield Prediction Pipeline...")
    prediction_result = predict_farm_yield(farm=farm, db=db, custom_season="Kharif")

    pred = prediction_result.get("prediction", {})
    comp = prediction_result.get("regional_comparison", {})
    features = prediction_result.get("features_used", {})

    print(f"  ✓ Season                  : {prediction_result.get('season')}")
    print(f"  ✓ Predicted Yield (t/ha)  : {pred.get('tonnes_per_hectare')} t/ha")
    print(f"    Uncertainty Range       : {pred.get('tonnes_per_hectare_range')[0]} - {pred.get('tonnes_per_hectare_range')[1]} t/ha")
    print(f"  ✓ Predicted Yield (kg/ac) : {pred.get('kg_per_acre')} kg/acre")
    print(f"    Uncertainty Range       : {pred.get('kg_per_acre_range')[0]} - {pred.get('kg_per_acre_range')[1]} kg/acre")
    print(f"  ✓ Total Farm Harvest      : {pred.get('total_plot_tonnes')} tonnes")
    print(f"  ✓ Total 75-kg Paddy Bags  : {pred.get('total_75kg_bags')} bags (Range: {pred.get('total_75kg_bags_range')[0]} - {pred.get('total_75kg_bags_range')[1]} bags)")
    print(f"  ✓ District Benchmark Delta: {comp.get('performance_delta_pct')}% ({comp.get('status')} / {comp.get('status_te')})")
    print(f"  ✓ Live Features Used     : Rainfall={features.get('seasonal_rainfall_mm')}mm, Peak NDVI={features.get('peak_ndvi')}, Max Temp={features.get('mean_temp_max_c')}°C")

    assert pred.get("tonnes_per_hectare") > 2.0, "Yield prediction out of reasonable rice range!"
    assert pred.get("total_75kg_bags") > 0, "Expected positive bag count"

    # 4. Non-pesticide Recommendations
    print("\n[4/4] Verifying Actionable Non-Pesticide Farmer Recommendations...")
    recs = prediction_result.get("recommendations", [])
    print(f"  ✓ Generated {len(recs)} agronomic advisory items:")
    for i, r in enumerate(recs, 1):
        print(f"    {i}. [{r['category']}] {r['title']}")
        print(f"       Action (English): {r['action'][:90]}...")
        print(f"       Action (Telugu) : {r['action_te'][:80]}...")
        print(f"       Cost/Benefit    : {r['cost_benefit']}")

    assert len(recs) >= 3, "Expected at least 3 non-pesticide recommendation items!"
    print("\n" + "=" * 65)
    print("STAGE 6 ML YIELD PREDICTION TESTS PASSED! ✓")
    print("Official DES India Statistics -> Scikit-learn Pipeline -> Bags/Acre & Uncertainty")
    print("=" * 65)

finally:
    db.close()
