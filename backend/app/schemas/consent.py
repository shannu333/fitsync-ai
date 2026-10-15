from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ConsentBase(BaseModel):
    consent_given: bool = True
    sms_language: str = "Telugu"

class ConsentCreate(ConsentBase):
    ip_address: Optional[str] = None

class ConsentResponse(ConsentBase):
    id: int
    user_id: int
    consent_date: datetime

    model_config = ConfigDict(from_attributes=True)
