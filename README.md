# RicePulse AP: AI-Based Early Crop Stress Detection and Yield Prediction System

[![FastAPI](https://img.shields.io/badge/FastAPI-v8.0.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF.svg?logo=vite)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python)](https://python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC.svg?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An intelligent, full-stack precision agriculture platform built specifically for the rice cultivators and agricultural extension officers of **Andhra Pradesh** (Godavari Delta, Krishna Delta, North Coastal, and Southern Rayalaseema agro-zones).

RicePulse AP integrates real-time optical remote sensing (Copernicus Sentinel-2), agro-meteorological reanalysis (Open-Meteo & NASA POWER), machine learning rice yield prediction (DES India), rule-based crop stress assessment, and automated bilingual (Telugu & English) Kisan SMS early warnings powered by background surveillance schedulers.

---

## 🌾 System Architecture & Capabilities (Stages 1–8)

```mermaid
flowchart TD
    subgraph Space & Remote Sensing
        S2["🛰️ Copernicus Sentinel-2 L2A<br/>(10m Optical Bands B03, B04, B08, B11, SCL)"]
    end

    subgraph Meteorology
        OM["🌦️ Open-Meteo API<br/>(ERA5 Reanalysis & 3-Day Forecast)"]
        NP["🚀 NASA POWER API<br/>(Solar Irradiance & Climatology)"]
    end

    subgraph State Yield Statistics
        DES["📊 DES India / AP Agriculture Dept<br/>(1980–2023 Historical District Records)"]
    end

    S2 --> S2Cache[("SQLite Cache<br/>(satellite_cache)")]
    OM --> WCache[("SQLite Cache<br/>(weather_cache)")]

    S2Cache & WCache --> Engine["🧠 Rule-Based Stress Engine<br/>(NDVI + NDMI + NDWI + Temp/Rain)"]
    DES --> ML["🤖 Scikit-Learn ML Model<br/>(Gradient Boosting R²=0.992)"]

    Engine --> Risk["⚠️ Early Stress Assessment<br/>(Drought, Heat Stress, Waterlogging)"]
    ML --> Yield["🌾 Rice Yield & MSP Revenue<br/>(Quintals/Acre + Uncertainty Range)"]

    Engine --> Sched["⏱️ APScheduler Background Worker<br/>(6-Hour Automated Farm Surveillance)"]
    Sched --> SMS["📱 Kisan SMS Engine<br/>(Bilingual Telugu/English DLT Templates)"]

    Risk & Yield & SMS --> Frontend["🌐 React 19 + Tailwind + Recharts<br/>(Farmer Dashboard & Protected Admin Portal)"]
```

### ✨ Core Features Across Stages

| Stage | Module | Key Capabilities |
|---|---|---|
| **Stage 1** | Foundation & Auth | JWT Bearer auth, bcrypt, SQLite schema, AP admin geography (13/26 districts, mandals, villages). |
| **Stage 2** | Farmer Dashboard | Multi-farm plot manager, Leaflet/OSM boundary polygon mapping, telemetry cards. |
| **Stage 3** | Weather Integration | Real Open-Meteo ERA5 hourly-aggregated stream, 30-day history + 3-day forecast, SQLite cache. |
| **Stage 4** | Satellite Remote Sensing | Copernicus CDSE OData API, Sentinel-2 L2A BOA reflectance, cloud masking (SCL), NDVI, NDMI, NDWI Recharts. |
| **Stage 5** | Stress Engine | Rule-based interpretable anomaly detector: Water Stress/Drought, Heat Stress, Excess Rain/Waterlogging. |
| **Stage 6** | ML Yield Prediction | Gradient Boosting model trained on 43 years of DES India AP rice yield data, R²=0.992, non-pesticide advisories. |
| **Stage 7** | Kisan SMS & Scheduler | APScheduler 6-hour background surveillance, 48-hour anti-spam cooldown, opt-in consent, simulated & live gateways. |
| **Stage 8** | Admin & Dataset Docs | Protected Admin Dashboard, API stream latency tests, failed SMS tracking, official dataset specifications. |

---

## 📁 Repository File Structure

```
fitsync-ai/
├── README.md                            # Complete system architecture and documentation
├── backend/
│   ├── .env                             # Environment variables & API credentials
│   ├── rice_stress_yield.db             # SQLite database (auto-created on startup)
│   ├── app/
│   │   ├── main.py                      # FastAPI app entry point & lifespan manager
│   │   ├── config.py                    # Pydantic BaseSettings & CORS configuration
│   │   ├── database.py                  # SQLAlchemy engine & session factory
│   │   ├── data/
│   │   │   ├── ap_admin_data.json       # AP districts, mandals, and villages
│   │   │   └── ap_des_rice_yield.json   # 59 historical AP rice yield records (DES India)
│   │   ├── models/
│   │   │   ├── user.py                  # Farmer user entity
│   │   │   ├── farm.py                  # Farm plot with boundaries & survey numbers
│   │   │   ├── consent.py               # SMS opt-in consent model
│   │   │   ├── weather_cache.py         # 24h weather observation cache
│   │   │   ├── satellite_cache.py       # Sentinel-2 spectral indices cache
│   │   │   └── sms_log.py               # Kisan SMS delivery audit trail
│   │   ├── routers/
│   │   │   ├── auth.py                  # /api/v1/auth/ (register, login, me)
│   │   │   ├── user.py                  # /api/v1/user/ (profile, farm, consent)
│   │   │   ├── geo.py                   # /api/v1/geo/ (districts, mandals, villages)
│   │   │   ├── farm.py                  # /api/v1/farms/ (CRUD + analytics)
│   │   │   ├── weather.py               # /api/v1/weather/ (Open-Meteo stream)
│   │   │   ├── satellite.py             # /api/v1/satellite/ (Copernicus Sentinel-2)
│   │   │   ├── stress.py                # /api/v1/stress/ (anomaly evaluation & simulation)
│   │   │   ├── yield_router.py          # /api/v1/yield/ (ML yield prediction & metrics)
│   │   │   ├── sms_router.py            # /api/v1/sms/ (history, test alert, trigger cycle)
│   │   │   └── admin.py                 # /api/v1/admin/ (district stats, health, SMS audit)
│   │   ├── services/
│   │   │   ├── weather.py               # Open-Meteo client & cache manager
│   │   │   ├── satellite.py             # Copernicus CDSE OData queries & spectral math
│   │   │   ├── stress_engine.py         # Multi-factor agronomic rule evaluator
│   │   │   ├── yield_predictor.py       # Scikit-learn inference pipeline
│   │   │   ├── sms_service.py           # SMS dispatcher, cooldown, & gateway integration
│   │   │   └── sms_templates.py         # Bilingual Telugu/English DLT templates
│   │   ├── ml/
│   │   │   ├── train_yield.py           # Scikit-learn model training script
│   │   │   ├── yield_model.joblib       # Serialized Gradient Boosting regressor
│   │   │   └── model_metrics.json       # Validated model metrics (R²=0.992)
│   │   └── jobs/
│   │       └── scheduler.py             # APScheduler 6-hour farm surveillance worker
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api_routes.py          # 20 automated Pytest unit & integration tests
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx                     # React DOM root
│   │   ├── App.jsx                      # Hash router & bilingual language context
│   │   ├── api.js                       # Axios HTTP client with auto JWT bearer
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Bilingual header with Farmer & Admin navigation
│   │   │   ├── Login.jsx                # One-click test farmer credentials login
│   │   │   ├── Register.jsx             # AP Farmer registration with map picker
│   │   │   ├── FarmMapPicker.jsx        # Leaflet GPS boundary & polygon picker
│   │   │   ├── FarmManagerModal.jsx     # Multi-farm plot CRUD modal
│   │   │   └── widgets/
│   │   │       ├── CropHealthStressWidget.jsx
│   │   │       ├── WeatherSummaryCard.jsx
│   │   │       ├── WeatherChartsPanel.jsx
│   │   │       ├── SatelliteObservationCard.jsx
│   │   │       ├── SatelliteChartsPanel.jsx
│   │   │       ├── FarmerRecommendationCard.jsx
│   │   │       ├── YieldPredictionCard.jsx
│   │   │       └── SMSHistoryPanel.jsx  # Stage 7 & 8 SMS audit trail table
│   │   └── pages/
│   │       ├── Dashboard.jsx            # Responsive farmer monitoring dashboard
│   │       ├── AdminDashboard.jsx       # Protected administrator surveillance portal
│   │       └── DatasetInfo.jsx          # Official dataset specifications & licenses
```

---

## 🛠️ Environment Configuration (`.env`)

Backend environment variables are configured in `backend/.env`:

```env
# ── Core API Configuration ──────────────────────────────────────────────────
PROJECT_NAME="RicePulse AP - Rice Crop Stress & Yield Prediction System"
API_V1_STR="/api/v1"
SECRET_KEY="ap_rice_farmers_secure_jwt_secret_key_change_in_production_2026"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── Database Connection ─────────────────────────────────────────────────────
# SQLite by default (portable, zero-setup)
DATABASE_URL="sqlite:///./rice_stress_yield.db"
# Or PostgreSQL for cloud production:
# DATABASE_URL="postgresql://user:password@localhost:5432/ricepulse"

# ── Administrator Access (Stage 8) ──────────────────────────────────────────
# Comma-separated list of 10-digit mobile numbers authorized as Administrators.
# Anyone logging in with these mobile numbers gains full access to /admin portal.
ADMIN_MOBILES="9876543210,9999999999"

# ── Kisan SMS Gateway Configuration (Stage 7) ──────────────────────────────
# Mode: "simulated" (default, free offline development) | "fast2sms" | "twilio"
SMS_PROVIDER="simulated"

# Optional live provider credentials:
FAST2SMS_API_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
```

### 👤 How to Add Your Personal Number as Admin

To authorize your own mobile number with administrator privileges:
1. Open `backend/.env`.
2. Add your 10-digit mobile number to `ADMIN_MOBILES`:
   ```env
   ADMIN_MOBILES="9876543210,9999999999,YOUR_10_DIGIT_NUMBER"
   ```
3. Register or log in to the web app with that mobile number.
4. Click the **🛡️ Admin** button in the navigation bar to access the protected Administrator Dashboard.

---

## 🚀 Running the Application

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: v18+ (tested with Vite 8.3)
- **PowerShell / Bash**

### 2. Backend Server (FastAPI)
```powershell
cd backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start Uvicorn ASGI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 3. Frontend Development Server (React Vite)
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- Web Application: `http://127.0.0.1:5173`

### 4. Default Test Credentials
- **Mobile Number**: `9876543210`
- **Password**: `FarmerPassword@2026`
- **Role**: Test Farmer & Authorized Administrator (Guntur District)

---

## 📲 Switching Between Simulated and Live SMS Modes

RicePulse AP provides dual-mode SMS dispatching:

### Option A: Simulated SMS Mode (Default)
- **Cost**: Free ($0)
- **Internet required**: No
- **Configuration**: `SMS_PROVIDER="simulated"` in `backend/.env`.
- Generates realistic `SIM-AP-XXXXXXXX` carrier message receipts, audits logs to SQLite, enforces the 48-hour cooldown, and renders full bilingual Telugu/English SMS previews in the dashboard.

### Option B: Live Indian SMS Gateway (Fast2SMS)
1. Sign up at [Fast2SMS](https://www.fast2sms.com/) and copy your API authorization key.
2. In `backend/.env`, set:
   ```env
   SMS_PROVIDER="fast2sms"
   FAST2SMS_API_KEY="your_actual_fast2sms_api_key_here"
   ```
3. Restart the backend server. Real SMS messages in Unicode Telugu will be delivered to farmers' phones.

---

## 🗄️ Database Commands & Maintenance

RicePulse AP uses SQLAlchemy 2.0 with automatic table initialization on startup (`init_db()`).

### Rebuilding or Resetting Database
```powershell
cd backend
# Delete existing SQLite database
Remove-Item rice_stress_yield.db

# Re-run tests or restart backend to regenerate fresh tables
.\venv\Scripts\python.exe -c "from app.database import init_db; init_db(); print('Tables created!')"
```

### Re-training the ML Rice Yield Model
```powershell
cd backend
.\venv\Scripts\python.exe -m app.ml.train_yield
```
Outputs model validation metrics (`MAE`, `RMSE`, `R²=0.992`) and saves the trained model to `backend/app/ml/yield_model.joblib`.

---

## 🧪 Automated Testing Suite (`pytest`)

The project contains 20 comprehensive automated unit & integration tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/test_api_routes.py -v
```

### Test Coverage Summary:
- ✅ Root & `/health` endpoint availability
- ✅ JWT Authentication (valid login, invalid password, token expiry, `/auth/me`)
- ✅ AP Geo Reference (Districts, Mandals, Villages)
- ✅ Multi-Farm CRUD lifecycle (create, fetch, delete)
- ✅ Machine Learning Yield Model Metrics (R² validation)
- ✅ Rule-Based Stress Simulation (Drought, Heatwave, Waterlogging)
- ✅ Kisan SMS Status, Gateway Modes, and Farmer History
- ✅ Administrator Authorization (`403 Forbidden` for non-admins, `200 OK` for authorized admins)
- ✅ AP Statewide District Farm Analytics & APScheduler Engine Status
- ✅ Failed SMS delivery audit log

---

## 📚 Official Datasets & Remote Sensing Specifications

| Dataset | Provider | Spatial Resolution | Temporal Coverage | License |
|---|---|---|---|---|
| **Copernicus Sentinel-2 L2A** | European Space Agency (ESA) | 10m / 20m optical bands | 2015–Present (5-day revisit) | Copernicus Open Access Policy |
| **Open-Meteo API** | Open-Meteo (ERA5 & ECMWF) | ~9km point interpolation | 1940–Present + 16-day forecast | CC BY 4.0 |
| **NASA POWER API** | NASA Langley Research Center | 0.5° × 0.5° grid (~55km) | 1981–Present | NASA Open Data Policy |
| **DES India Rice Statistics** | Directorate of Economics & Statistics, GoI | District-level aggregates | 1980–2023 (43 years, 59 records) | Government of India Open Data |

Detailed dataset documentation, band formulas, coverage maps, and scientific limitations can be reviewed directly in the web app under the **[Datasets](http://127.0.0.1:5173/#/datasets)** page.

---

## 🛡️ Ground-Truth Scientific Disclaimer

> **Important**: All vegetation index calculations (NDVI, NDMI, NDWI), stress risk classifications, and machine learning yield predictions provided by RicePulse AP are scientific estimates based on orbital remote sensing and meteorological reanalysis. They do not replace on-site agronomic inspection. Agricultural extension officers and farmers must conduct ground verification before applying chemical inputs, fertilizer adjustments, or altering irrigation regimes.
