from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re
from app.schemas.farm import FarmResponse
from app.schemas.consent import ConsentResponse

class UserRegisterRequest(BaseModel):
    # Personal & Location Details (Andhra Pradesh Farmer)
    full_name: str = Field(..., min_length=2, max_length=100, description="Farmer's full name")
    mobile_number: str = Field(..., description="10-digit Indian mobile number")
    password: str = Field(..., min_length=6, description="Account password (min 6 characters)")
    district: str = Field(..., min_length=2, max_length=100, description="AP District (e.g. East Godavari)")
    mandal: str = Field(..., min_length=2, max_length=100, description="AP Mandal")
    village: str = Field(..., min_length=2, max_length=100, description="AP Village")
    preferred_language: str = Field(default="Telugu", description="Language preference: 'Telugu' or 'English'")

    # Primary Farm Details for Rice Monitoring
    farm_name: Optional[str] = Field(default="వరి పొలం (Main Rice Plot)", description="Farm label")
    variety: Optional[str] = Field(default="BPT 5204 (Samba Mahsuri)", description="Rice paddy variety")
    area_acres: float = Field(..., gt=0, description="Farm land size in acres")
    area_cents: Optional[float] = Field(default=0.0, ge=0, description="Additional area in cents")
    latitude: Optional[float] = Field(default=None, description="GPS Latitude")
    longitude: Optional[float] = Field(default=None, description="GPS Longitude")
    sowing_date: date = Field(..., description="Sowing or transplantation date (YYYY-MM-DD)")
    soil_type: Optional[str] = Field(default=None, description="Soil classification")
    irrigation_source: Optional[str] = Field(default=None, description="Irrigation source")

    # SMS Advisory Consent
    sms_consent: bool = Field(default=True, description="Consent to receive SMS alerts for pest/weather/stress warnings")

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        # Strip whitespace, dashes, +91 if present
        clean = re.sub(r"[\s\-\+]", "", v)
        if clean.startswith("91") and len(clean) == 12:
            clean = clean[2:]
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return clean

class UserLoginRequest(BaseModel):
    mobile_number: str = Field(..., description="10-digit mobile number")
    password: str = Field(..., min_length=1, description="Password")

    @field_validator("mobile_number")
    @classmethod
    def clean_mobile(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\+]", "", v)
        if clean.startswith("91") and len(clean) == 12:
            clean = clean[2:]
        return clean

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    district: Optional[str] = None
    mandal: Optional[str] = None
    village: Optional[str] = None
    preferred_language: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: int
    full_name: str
    mobile_number: str
    district: str
    mandal: str
    village: str
    preferred_language: str
    is_active: bool
    created_at: datetime
    farms: List[FarmResponse] = []
    consent: Optional[ConsentResponse] = None

    model_config = ConfigDict(from_attributes=True)
