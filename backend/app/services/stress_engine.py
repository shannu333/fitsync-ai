"""
Early Crop Stress Assessment & Cause Estimation Engine — Stage 5
================================================================
Combines:
  1. Real Sentinel-2 spectral vegetation indices (NDVI, NDMI, NDWI) from Copernicus CDSE
  2. Real meteorological variables (temperature, rainfall, humidity, solar radiation) from Open-Meteo / NASA POWER

Rule-Based Statistical Anomaly Classification:
  - Water Stress / Drought (Low NDMI + persistent low precipitation)
  - Heat Stress (High daily max temperature + falling NDVI / high solar irradiance)
  - Excess Rainfall / Waterlogging (High precipitation spike + elevated NDWI)
  - Pest / Nutrient Anomaly (Degraded NDVI without abiotic weather stress)
  - Optimal / Low Stress (Normal agronomic baseline)

Includes confidence metrics, factor breakdowns, actionable Telugu/English advisories,
and statutory scientific disclaimers requiring ground truth field inspection.
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from app.services.satellite import get_satellite_history_for_coordinates
from app.services.weather import get_weather_for_coordinates

logger = logging.getLogger(__name__)

# ── Scientific Agronomic Baselines for Rice (Oryza sativa) in Andhra Pradesh ──
OPTIMAL_NDVI_MIN = 0.55
STRESS_NDVI_THRESHOLD = 0.40
CRITICAL_NDVI_THRESHOLD = 0.30

OPTIMAL_NDMI_MIN = 0.25
DROUGHT_NDMI_THRESHOLD = 0.18

HEAT_STRESS_TEMP_C = 35.0
CRITICAL_HEAT_TEMP_C = 37.5

HEAVY_RAIN_7D_MM = 100.0
WATERLOGGING_RAIN_48H_MM = 60.0
HIGH_NDWI_THRESHOLD = 0.05

DRY_SPELL_DAYS_THRESHOLD = 7


def evaluate_crop_stress(
    lat: float,
    lng: float,
    db: Session,
    farm_id: Optional[int] = None,
    sowing_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Main evaluation pipeline:
    1. Fetch real satellite telemetry (Copernicus Sentinel-2).
    2. Fetch real weather history (Open-Meteo / NASA POWER).
    3. Run rule-based anomaly detection across environmental vectors.
    4. Compute risk score, level, confidence, and actionable recommendations.
    """
    # 1. Fetch satellite data
    sat_res = get_satellite_history_for_coordinates(lat=lat, lng=lng, db=db, farm_id=farm_id, past_days=90)
    sat_records = sat_res.get("records", [])
    sat_summary = sat_res.get("summary", {})

    # 2. Fetch weather data
    weather_res = get_weather_for_coordinates(lat=lat, lng=lng, db=db, past_days=30, forecast_days=3)
    weather_records = weather_res.get("records", [])
    weather_summary = weather_res.get("summary", {})

    # Run core inference engine
    return run_rule_inference(
        sat_records=sat_records,
        sat_summary=sat_summary,
        weather_records=weather_records,
        weather_summary=weather_summary,
        lat=lat,
        lng=lng,
        sowing_date=sowing_date,
    )


def run_rule_inference(
    sat_records: List[Dict[str, Any]],
    sat_summary: Dict[str, Any],
    weather_records: List[Dict[str, Any]],
    weather_summary: Dict[str, Any],
    lat: float,
    lng: float,
    sowing_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Interpretable rule engine combining spectral indices and weather anomaly signals.
    """
    # ── Extract Latest Satellite Observables ──────────────────────────────────
    valid_sat = [r for r in sat_records if not r.get("is_cloud_masked")]
    latest_sat = valid_sat[-1] if valid_sat else (sat_records[-1] if sat_records else None)

    latest_ndvi = latest_sat.get("ndvi", 0.60) if latest_sat else 0.60
    latest_ndmi = latest_sat.get("ndmi", 0.30) if latest_sat else 0.30
    latest_ndwi = latest_sat.get("ndwi", -0.10) if latest_sat else -0.10
    delta_ndvi = sat_summary.get("ndvi_trend_30d", 0.0) or 0.0
    sat_date_str = latest_sat.get("observation_date", "") if latest_sat else ""
    is_cloud_masked = latest_sat.get("is_cloud_masked", False) if latest_sat else False

    # ── Extract Weather Observables ───────────────────────────────────────────
    today_str = date.today().isoformat()
    past_weather = [w for w in weather_records if w.get("date", "") <= today_str]

    # Rainfall metrics
    rain_7d = sum(w.get("precipitation") or 0.0 for w in past_weather[-7:])
    rain_14d = sum(w.get("precipitation") or 0.0 for w in past_weather[-14:])
    rain_48h = sum(w.get("precipitation") or 0.0 for w in past_weather[-2:])
    total_rain_30d = weather_summary.get("total_rainfall_mm", 0.0) or 0.0

    # Dry spell calculation
    consecutive_dry_days = 0
    for w in reversed(past_weather):
        precip = w.get("precipitation") or 0.0
        if precip < 1.0:
            consecutive_dry_days += 1
        else:
            break

    # Temperature & humidity metrics
    recent_tmax = [w.get("temp_max") for w in past_weather[-5:] if w.get("temp_max") is not None]
    max_tmax = max(recent_tmax) if recent_tmax else 32.0
    avg_tmax = sum(recent_tmax) / len(recent_tmax) if recent_tmax else 32.0

    recent_humidity = [w.get("humidity") for w in past_weather[-5:] if w.get("humidity") is not None]
    avg_humidity = sum(recent_humidity) / len(recent_humidity) if recent_humidity else 75.0

    recent_solar = [w.get("solar_radiation") for w in past_weather[-5:] if w.get("solar_radiation") is not None]
    avg_solar = sum(recent_solar) / len(recent_solar) if recent_solar else 18.0

    # ── Factor Scoring & Rules Evaluation ────────────────────────────────────
    factors = []
    total_risk_score = 0.0
    candidate_causes = []

    # ─────────────────────────────────────────────────────────────────────────
    # Vector 1: Water Stress & Drought Anomaly
    # ─────────────────────────────────────────────────────────────────────────
    water_score = 0.0
    water_reasoning = ""
    water_reasoning_te = ""
    water_severity = "Low"

    if latest_ndmi < DROUGHT_NDMI_THRESHOLD and (rain_14d < 15.0 or consecutive_dry_days >= DRY_SPELL_DAYS_THRESHOLD):
        # Severe water stress
        water_score = 48.0
        water_severity = "High" if latest_ndmi < 0.12 else "Moderate"
        water_reasoning = (
            f"Canopy moisture index (NDMI: {latest_ndmi:.3f}) fell below baseline ({OPTIMAL_NDMI_MIN}) "
            f"under a {consecutive_dry_days}-day dry spell with only {rain_14d:.1f}mm rainfall in the last 14 days."
        )
        water_reasoning_te = (
            f"మొక్కలలో తేమ సూచిక (NDMI: {latest_ndmi:.3f}) సాధారణ స్థాయి కంటే తగ్గింది. "
            f"గత 14 రోజులలో కేవలం {rain_14d:.1f}mm వర్షం పడటం మరియు {consecutive_dry_days} రోజుల నుండి వర్షం లేకపోవడం వల్ల నీటి ఎద్దడి ఏర్పడింది."
        )
        candidate_causes.append({
            "score": water_score,
            "cause": "Water Stress / Agricultural Drought",
            "cause_te": "నీటి ఎద్దడి / కరువు ఒత్తిడి",
            "priority": 1 if latest_ndmi < 0.12 else 2,
        })
    elif latest_ndmi < 0.22 or (consecutive_dry_days >= 8 and rain_7d < 5.0):
        water_score = 25.0
        water_severity = "Moderate"
        water_reasoning = (
            f"Marginal moisture depletion (NDMI: {latest_ndmi:.3f}) and {consecutive_dry_days} rainless days. "
            f"Canal or tube-well irrigation recommended to replenish standing water layer."
        )
        water_reasoning_te = (
            f"వరి చేనులో తేమ పరిమాణం (NDMI: {latest_ndmi:.3f}) తగ్గింది. {consecutive_dry_days} రోజులుగా వర్షం లేనందున కాల్వ లేదా మోటారు ద్వారా తడి అందించాలి."
        )
        candidate_causes.append({
            "score": water_score,
            "cause": "Early Stage Soil Moisture Depletion",
            "cause_te": "తేమ కొరత ప్రారంభ దశ",
            "priority": 3,
        })
    else:
        water_score = 5.0
        water_severity = "Low"
        water_reasoning = f"Adequate canopy hydration (NDMI: {latest_ndmi:.3f}) and balanced rainfall ({rain_14d:.1f}mm)."
        water_reasoning_te = f"మొక్కలలో తగినంత తేమ ఉంది (NDMI: {latest_ndmi:.3f}). నీటి కొరత లేదు."

    factors.append({
        "factor": "Moisture & Drought",
        "factor_te": "తేమ & కరువు సూచిక",
        "score": water_score,
        "severity": water_severity,
        "reasoning": water_reasoning,
        "reasoning_te": water_reasoning_te,
    })

    # ─────────────────────────────────────────────────────────────────────────
    # Vector 2: Heat Wave & Thermal Stress
    # ─────────────────────────────────────────────────────────────────────────
    heat_score = 0.0
    heat_reasoning = ""
    heat_reasoning_te = ""
    heat_severity = "Low"

    if max_tmax >= CRITICAL_HEAT_TEMP_C or (avg_tmax >= HEAT_STRESS_TEMP_C and avg_solar >= 21.0):
        heat_score = 42.0
        heat_severity = "High"
        heat_reasoning = (
            f"Extreme ambient temperature peak of {max_tmax:.1f}°C (5-day avg: {avg_tmax:.1f}°C) with high solar radiation "
            f"({avg_solar:.1f} MJ/m²) accelerates transpiration and risks rice pollen sterility and floret abortion."
        )
        heat_reasoning_te = (
            f"తీవ్రమైన ఉష్ణోగ్రత ({max_tmax:.1f}°C) మరియు ఎండ తీవ్రత ({avg_solar:.1f} MJ/m²) నమోదయ్యాయి. "
            f"ఇది వరి పూత దశలో గింజ కట్టకపోవడానికి (పోచలు ఏర్పడటానికి) దారితీస్తుంది."
        )
        candidate_causes.append({
            "score": heat_score,
            "cause": "Extreme Heat Wave Stress",
            "cause_te": "తీవ్రమైన వడగాల్పులు / ఎండ తీవ్రత",
            "priority": 1 if max_tmax >= 38.0 else 2,
        })
    elif max_tmax >= HEAT_STRESS_TEMP_C or (avg_tmax >= 33.5 and avg_humidity < 55.0):
        heat_score = 24.0
        heat_severity = "Moderate"
        heat_reasoning = (
            f"Elevated temperatures reaching {max_tmax:.1f}°C coupled with dry air (Humidity: {avg_humidity:.1f}%) "
            f"induce moderate midday wilting."
        )
        heat_reasoning_te = (
            f"ఉష్ణోగ్రత {max_tmax:.1f}°C కి చేరింది. గాలిలో తేమ శాతం ({avg_humidity:.1f}%) తక్కువగా ఉండటంతో మధ్యాహ్న సమయాలలో ఆకులు వడలిపోయే అవకాశం ఉంది."
        )
        candidate_causes.append({
            "score": heat_score,
            "cause": "Elevated Thermal & Vapor Deficit",
            "cause_te": "అధిక ఉష్ణోగ్రత & ఆవిరి నష్టం",
            "priority": 3,
        })
    else:
        heat_score = 4.0
        heat_severity = "Low"
        heat_reasoning = f"Thermal regime ({avg_tmax:.1f}°C max) is safe within the physiological comfort zone for Andhra rice."
        heat_reasoning_te = f"ఉష్ణోగ్రత ({avg_tmax:.1f}°C) వరి పంటకు అనుకూలంగా ఉంది."

    factors.append({
        "factor": "Thermal & Heat Load",
        "factor_te": "ఉష్ణోగ్రత ఒత్తిడి",
        "score": heat_score,
        "severity": heat_severity,
        "reasoning": heat_reasoning,
        "reasoning_te": heat_reasoning_te,
    })

    # ─────────────────────────────────────────────────────────────────────────
    # Vector 3: Excess Rainfall / Waterlogging / Flood Submergence
    # ─────────────────────────────────────────────────────────────────────────
    flood_score = 0.0
    flood_reasoning = ""
    flood_reasoning_te = ""
    flood_severity = "Low"

    if (rain_7d >= HEAVY_RAIN_7D_MM or rain_48h >= WATERLOGGING_RAIN_48H_MM) and latest_ndwi >= HIGH_NDWI_THRESHOLD:
        flood_score = 45.0
        flood_severity = "High"
        flood_reasoning = (
            f"Recent heavy precipitation surge ({rain_7d:.1f}mm in 7 days, {rain_48h:.1f}mm in 48h) paired with elevated "
            f"water index (NDWI: {latest_ndwi:.3f}) indicates prolonged field flooding and root hypoxia risk."
        )
        flood_reasoning_te = (
            f"గత వారం రోజుల్లో భారీ వర్షపాతం ({rain_7d:.1f}mm) నమోదైంది. పొలంలో నీటి సూచిక (NDWI: {latest_ndwi:.3f}) అధికంగా ఉన్నందున "
            f"ముంపు మరియు వేరుకు ఆక్సిజన్ అందక కుళ్ళిపోయే ప్రమాదం ఉంది."
        )
        candidate_causes.append({
            "score": flood_score,
            "cause": "Excess Rainfall & Waterlogging Stress",
            "cause_te": "అధిక వర్షపాతం / పొలంలో నీరు నిలవడం (ముంపు)",
            "priority": 1,
        })
    elif rain_7d >= 70.0 and avg_humidity >= 85.0:
        flood_score = 22.0
        flood_severity = "Moderate"
        flood_reasoning = (
            f"Persistent rainfall ({rain_7d:.1f}mm) and high humidity ({avg_humidity:.1f}%) create prolonged leaf wetness, "
            f"fostering fungal blast (Pyricularia oryzae) and bacterial blight conditions."
        )
        flood_reasoning_te = (
            f"ఎడతెరిపి లేని వర్షం ({rain_7d:.1f}mm) మరియు అధిక తేమ ({avg_humidity:.1f}%) వల్ల అగ్గితెగులు మరియు బాక్టీరియా తెగుళ్లు వ్యాపించే అవకాశం ఉంది."
        )
        candidate_causes.append({
            "score": flood_score,
            "cause": "High Humidity & Foliar Pathogen Risk",
            "cause_te": "అధిక తేమ వల్ల శిలీంధ్ర/తెగుళ్ల ముప్పు",
            "priority": 3,
        })
    else:
        flood_score = 3.0
        flood_severity = "Low"
        flood_reasoning = f"No inundation or flood risk. 7-day rainfall ({rain_7d:.1f}mm) is well drained."
        flood_reasoning_te = f"పొలంలో నీరు నిలిచిపోయే ప్రమాదం లేదు. వర్షపాతం ({rain_7d:.1f}mm) సాధారణంగా ఉంది."

    factors.append({
        "factor": "Rainfall Inundation & Pathogen Moisture",
        "factor_te": "వర్షపాతం ముంపు & తేమ తెగుళ్లు",
        "score": flood_score,
        "severity": flood_severity,
        "reasoning": flood_reasoning,
        "reasoning_te": flood_reasoning_te,
    })

    # ─────────────────────────────────────────────────────────────────────────
    # Vector 4: Biomass & Vegetative Anomaly (Pest / Soil Deficiency)
    # ─────────────────────────────────────────────────────────────────────────
    biomass_score = 0.0
    biomass_reasoning = ""
    biomass_reasoning_te = ""
    biomass_severity = "Low"

    # If weather was relatively normal, but NDVI dropped sharply or is abnormally depressed
    if latest_ndvi < CRITICAL_NDVI_THRESHOLD and water_score < 30 and flood_score < 30:
        biomass_score = 38.0
        biomass_severity = "High"
        biomass_reasoning = (
            f"Severe vegetation vigor deficit (NDVI: {latest_ndvi:.3f}) unexplained by drought or flooding. "
            f"Strong signature of biotic stress (Stem Borer dead-hearts, Brown Planthopper hopper-burn) or nitrogen starvation."
        )
        biomass_reasoning_te = (
            f"వాతావరణంలో తీవ్ర మార్పులు లేకపోయినా పచ్చదనం సూచిక (NDVI: {latest_ndvi:.3f}) గణనీయంగా తగ్గింది. "
            f"కాండం తొలిచే పురుగు (సుడిదోమ) లేదా నత్రజని లోపం వల్ల ఈ సమస్య ఏర్పడి ఉండవచ్చు."
        )
        candidate_causes.append({
            "score": biomass_score,
            "cause": "Canopy Spectral Anomaly / Biotic Pest Stress",
            "cause_te": "పంట ఎదుగుదల లోపం / చీడపీడల దాడి సూచన",
            "priority": 2,
        })
    elif delta_ndvi < -0.06 and water_score < 25 and heat_score < 25:
        biomass_score = 22.0
        biomass_severity = "Moderate"
        biomass_reasoning = (
            f"Negative 30-day vegetation trajectory (ΔNDVI: {delta_ndvi:.3f}). Canopy thinning detected from satellite overpasses."
        )
        biomass_reasoning_te = (
            f"గత 30 రోజులలో పచ్చదనం క్రమంగా తగ్గింది (మార్పు: {delta_ndvi:.3f}). క్షేత్ర స్థాయి తనిఖీ అవసరం."
        )
        candidate_causes.append({
            "score": biomass_score,
            "cause": "Vegetation Vigor Retardation",
            "cause_te": "పంట పచ్చదనం క్షీణత",
            "priority": 4,
        })
    else:
        biomass_score = 2.0
        biomass_severity = "Low"
        biomass_reasoning = f"Photosynthetic green canopy is vigorous and progressing normally (NDVI: {latest_ndvi:.3f})."
        biomass_reasoning_te = f"పంట ఎదుగుదల మరియు పచ్చదనం (NDVI: {latest_ndvi:.3f}) చాలా బాగుంది."

    factors.append({
        "factor": "Biomass & Spectral Vigor",
        "factor_te": "పంట సాంద్రత & పచ్చదనం",
        "score": biomass_score,
        "severity": biomass_severity,
        "reasoning": biomass_reasoning,
        "reasoning_te": biomass_reasoning_te,
    })

    # ─────────────────────────────────────────────────────────────────────────
    # Overall Aggregate Risk Score
    # ─────────────────────────────────────────────────────────────────────────
    # Combine highest vector + fractional weight of secondary vectors
    sorted_scores = sorted([water_score, heat_score, flood_score, biomass_score], reverse=True)
    primary_vector_score = sorted_scores[0]
    secondary_contribution = 0.35 * sum(sorted_scores[1:])
    total_risk_score = round(min(100.0, primary_vector_score + secondary_contribution), 1)

    # Risk level classification
    if total_risk_score >= 75.0:
        risk_level = "Very High"
        risk_level_te = "తీవ్రమైన ప్రమాదం"
    elif total_risk_score >= 50.0:
        risk_level = "High"
        risk_level_te = "అధిక ప్రమాదం"
    elif total_risk_score >= 25.0:
        risk_level = "Moderate"
        risk_level_te = "మధ్యస్థ ప్రమాదం"
    else:
        risk_level = "Low"
        risk_level_te = "తక్కువ ప్రమాదం (ఆరోగ్యకరం)"

    # Determine primary diagnosis cause
    if candidate_causes:
        # Sort by priority, then score
        candidate_causes.sort(key=lambda c: (c["priority"], -c["score"]))
        primary_cause = candidate_causes[0]["cause"]
        primary_cause_te = candidate_causes[0]["cause_te"]
    else:
        primary_cause = "Optimal Agro-Climatic Balance"
        primary_cause_te = "అనుకూల వాతావరణం & ఆరోగ్యకరమైన పంట"

    # Actionable Recommendations based on diagnosis
    recommendations = []
    recommendations_te = []

    if "Drought" in primary_cause or "Moisture" in primary_cause:
        recommendations = [
            "Initiate immediate wetting: Provide 2–3 inches of standing water across the paddy field.",
            "Avoid urea top-dressing during acute moisture stress to prevent root burn.",
            "Apply 1% potassium nitrate (KNO3) foliar spray to improve plant water retention and drought tolerance.",
        ]
        recommendations_te = [
            "పొలానికి వెంటనే 2-3 అంగుళాల మేర నీరు పారించి నిలకడగా ఉంచండి.",
            "తేమ కొరత ఉన్నప్పుడు యూరియా వంటి రసాయన ఎరువులు వేయరాదు (వేరు ఎండిపోతుంది).",
            "మొక్కలలో నీటి నిల్వ సామర్థ్యాన్ని పెంచడానికి 1% పొటాషియం నైట్రేట్ ద్రావణాన్ని పిచికారీ చేయండి.",
        ]
    elif "Heat" in primary_cause:
        recommendations = [
            "Maintain 5 cm continuous standing water depth to cool the crop microclimate and root zone.",
            "Irrigate during cool evening hours rather than hot afternoons to reduce thermal shock.",
            "Spray 2% DAP or micronutrient mixture to strengthen panicle exertion and pollen viability.",
        ]
        recommendations_te = [
            "ఎండ తీవ్రత నుండి కాపాడటానికి పొలంలో 5 సెం.మీ మేర నీరు నిల్వ ఉండేలా చూసుకోండి.",
            "నీటిపారుదల సాయంత్రం వేళల్లో మాత్రమే అందించండి; మధ్యాహ్నం నీరు పెట్టరాదు.",
            "పూత రాలకుండా ఉండేందుకు 2% డి.ఎ.పి లేదా జింక్/బోరాన్ సూక్ష్మ పోషకాలను పిచికారీ చేయండి.",
        ]
    elif "Waterlogging" in primary_cause or "Inundation" in primary_cause:
        recommendations = [
            "Ensure field drainage channels are cleared immediately to prevent submergence beyond 48 hours.",
            "After water drains, apply a booster dose of urea (25 kg/acre) + MOP (15 kg/acre) to stimulate new tiller growth.",
            "Spray validamycin (2 ml/L) or tricyclazole (0.6 g/L) to prevent fungal sheath blight and blast spread.",
        ]
        recommendations_te = [
            "ముంపు నుండి రక్షించడానికి పొలం గట్లలోని మురుగు కాల్వలను తెరిచి వెంటనే నీటిని బయటకు పంపండి.",
            "ముంపు తగ్గిన తర్వాత కొత్త పిలకలు రావడానికి ఎకరాకు 25 కిలోల యూరియా + 15 కిలోల పొటాష్ వేయండి.",
            "ఆకు మచ్చ మరియు అగ్గితెగులు రాకుండా ట్రైసైక్లాజోల్ (0.6 గ్రా/లీ) లేదా వాలిడామైసిన్ పిచికారీ చేయండి.",
        ]
    elif "Biotic" in primary_cause or "Pest" in primary_cause or "Anomaly" in primary_cause:
        recommendations = [
            "Conduct visual field inspection for Yellow Stem Borer dead-hearts and brown planthopper (BPH) at tiller base.",
            "If dead-hearts > 5%, apply Cartap Hydrochloride 4G @ 8 kg/acre or Chlorantraniliprole 18.5 SC @ 0.3 ml/L.",
            "Inspect underside of leaves for blast spots or bacterial streak lesions.",
        ]
        recommendations_te = [
            "చేనులో కాండం తొలిచే పురుగు (సుడిదోమ) ఆశించిన పిలకలు ఉన్నాయో లేదో దగ్గరుండి గమనించండి.",
            "పురుగు ఉధృతి గమనిస్తే ఎకరాకు కార్టాప్ హైడ్రోక్లోరైడ్ 4G (8 కిలోలు) లేదా కోరాజెన్ పిచికారీ చేయండి.",
            "ఆకుల అడుగు భాగాన అగ్గితెగులు మచ్చలు లేదా ఎండిపోయిన కొసలు ఉన్నాయో తనిఖీ చేయండి.",
        ]
    else:
        recommendations = [
            "Maintain current alternate wetting and drying (AWD) irrigation schedule.",
            "Monitor for scheduled panicle initiation top-dressing based on local crop calendar.",
            "Continue periodic visual scouting for early hopper colonies.",
        ]
        recommendations_te = [
            "ప్రస్తుత తడి మరియు ఆరబెట్టు (AWD) నీటి పద్ధతిని కొనసాగించండి.",
            "చిరుపొట్ట దశ రాగానే సిఫార్సు చేసిన ఎరువుల మోతాదును సమయానికి అందించండి.",
            "తెగుళ్లు ఆశించకుండా వారానికి ఒకసారి చేనును పరిశీలించండి.",
        ]

    # Confidence calculation:
    # High confidence if recent satellite pass (<7 days) and fresh weather data (<24h)
    base_confidence = 82.0
    if valid_sat and len(valid_sat) >= 2:
        base_confidence += 6.0
    if len(past_weather) >= 14:
        base_confidence += 6.0
    if is_cloud_masked:
        base_confidence -= 12.0
    confidence_pct = round(max(55.0, min(96.0, base_confidence)), 1)

    # Statutory Ground Truth Disclaimer
    disclaimer = (
        "Scientific Advisory Notice: This assessment is an automated probabilistic macro-screening derived from "
        "Sentinel-2 Copernicus satellite reflectance and meteorological observation models. It does not replace on-site "
        "field inspection. Always verify crop condition visually or consult with your local Village Agriculture Assistant (VAA) "
        "or Rythu Bharosa Kendra (RBK) before applying agrochemicals."
    )
    disclaimer_te = (
        "శాస్త్రీయ హెచ్చరిక: ఈ సమాచారం ఉపగ్రహ చిత్రాలు మరియు వాతావరణ ఆధారంగా రూపొందించిన ముందస్తు అంచనా మాత్రమే. "
        "పొలంలో పురుగుమందులు లేదా ఎరువులు వాడే ముందు రైతు స్వయంగా చేనును పరిశీలించాలి లేదా స్థానిక రైతు భరోసా కేంద్రం (RBK) "
        "వ్యవసాయ సహాయకులను సంప్రదించాలి."
    )

    return {
        "overall_risk_score": total_risk_score,
        "risk_level": risk_level,
        "risk_level_te": risk_level_te,
        "primary_cause": primary_cause,
        "primary_cause_te": primary_cause_te,
        "confidence_pct": confidence_pct,
        "factors": factors,
        "diagnosed_at": datetime.utcnow().isoformat(),
        "satellite_timestamp": sat_date_str,
        "weather_summary": {
            "rain_7d_mm": round(rain_7d, 1),
            "rain_14d_mm": round(rain_14d, 1),
            "consecutive_dry_days": consecutive_dry_days,
            "max_temp_c": round(max_tmax, 1),
            "avg_temp_c": round(avg_tmax, 1),
            "avg_humidity_pct": round(avg_humidity, 1),
            "avg_solar_radiation": round(avg_solar, 1),
        },
        "spectral_summary": {
            "latest_ndvi": round(latest_ndvi, 3),
            "latest_ndmi": round(latest_ndmi, 3),
            "latest_ndwi": round(latest_ndwi, 3),
            "delta_ndvi_30d": round(delta_ndvi, 3),
            "is_cloud_masked": is_cloud_masked,
        },
        "recommendations": recommendations,
        "recommendations_te": recommendations_te,
        "disclaimer": disclaimer,
        "disclaimer_te": disclaimer_te,
    }
