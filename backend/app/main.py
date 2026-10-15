from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import (
    auth_router,
    user_router,
    geo_router,
    farm_router,
    weather_router,
    satellite_router,
    stress_router,
    yield_router,
    sms_router,
    admin_router,
)
from app.jobs.scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables automatically on startup
    init_db()
    # Start APScheduler background surveillance worker
    start_scheduler()
    yield
    # Graceful shutdown of scheduler
    shutdown_scheduler()

app = FastAPI(
    title="RicePulse AP - Crop Stress Detection & Yield Prediction System",
    description="Backend API for Andhra Pradesh rice farmers — automated Kisan SMS notifications, APScheduler background surveillance, ML yield prediction (DES India), early stress assessment, Sentinel-2 satellite analytics, and administrator operations.",
    version="8.0.0",
    lifespan=lifespan
)

# CORS configuration to allow React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(user_router, prefix=settings.API_V1_STR)
app.include_router(geo_router, prefix=settings.API_V1_STR)
app.include_router(farm_router, prefix=settings.API_V1_STR)
app.include_router(weather_router, prefix=settings.API_V1_STR)
app.include_router(satellite_router, prefix=settings.API_V1_STR)
app.include_router(stress_router, prefix=settings.API_V1_STR)
app.include_router(yield_router, prefix=settings.API_V1_STR)
app.include_router(sms_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": "RicePulse AP - Crop Stress Detection & Yield Prediction System",
        "state": "Andhra Pradesh",
        "stage": "Stage 8: Admin Dashboard, Dataset Information & Production Ready",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
