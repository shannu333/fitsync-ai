from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class SMSConsent(Base):
    __tablename__ = "sms_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    consent_given = Column(Boolean, default=True, nullable=False)
    consent_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sms_language = Column(String(20), default="Telugu", nullable=False)
    ip_address = Column(String(45), nullable=True)

    # Relationships
    user = relationship("User", back_populates="consent")
