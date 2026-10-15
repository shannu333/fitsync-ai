from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    farm_name = Column(String(120), default="Main Rice Plot", nullable=False)
    crop_type = Column(String(50), default="Rice (వరి)", nullable=False)
    variety = Column(String(100), nullable=True)  # e.g., BPT 5204 (Samba Mahsuri), MTU 1010
    area_acres = Column(Float, nullable=False)
    area_cents = Column(Float, default=0.0, nullable=True)
    field_survey_number = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    boundary_points = Column(Text, nullable=True)  # JSON-encoded array of {lat, lng} polygon points
    sowing_date = Column(Date, nullable=False)
    soil_type = Column(String(100), nullable=True)
    irrigation_source = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="farms")
