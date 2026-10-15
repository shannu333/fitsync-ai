import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RicePulse AP - Crop Stress & Yield Prediction"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "ap_rice_farmers_secure_jwt_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # SQLite by default, seamlessly switchable to PostgreSQL: postgresql://user:pass@localhost/dbname
    DATABASE_URL: str = "sqlite:///./rice_stress_yield.db"
    
    DEFAULT_STATE: str = "Andhra Pradesh"
    DEFAULT_LANGUAGE: str = "Telugu"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        case_sensitive = True
        extra = "allow"

settings = Settings()
