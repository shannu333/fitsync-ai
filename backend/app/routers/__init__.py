from app.routers.auth import router as auth_router
from app.routers.user import router as user_router
from app.routers.geo import router as geo_router
from app.routers.farm import router as farm_router
from app.routers.weather import router as weather_router
from app.routers.satellite import router as satellite_router
from app.routers.stress import router as stress_router
from app.routers.yield_router import router as yield_router
from app.routers.sms_router import router as sms_router
from app.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "user_router",
    "geo_router",
    "farm_router",
    "weather_router",
    "satellite_router",
    "stress_router",
    "yield_router",
    "sms_router",
    "admin_router",
]
