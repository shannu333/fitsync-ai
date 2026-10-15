from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    mobile_number = Column(String(15), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    mandal = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    preferred_language = Column(String(20), default="Telugu", nullable=False)  # "English" or "Telugu"
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")
    consent = relationship("SMSConsent", back_populates="user", uselist=False, cascade="all, delete-orphan")
