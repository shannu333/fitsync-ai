"""
SMSNotificationLog SQLAlchemy Model — Stage 7
Stores all automated Kisan SMS alerts, delivery statuses, provider receipts,
and cooldown timestamps.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SMSNotificationLog(Base):
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)

    mobile_number = Column(String(20), nullable=False, index=True)
    preferred_language = Column(String(20), default="Telugu")  # Telugu or English

    stress_category = Column(String(60), nullable=False)  # Drought, Heat Wave, Waterlogging, Pest Anomaly, etc.
    risk_level = Column(String(30), nullable=False)        # Moderate, High, Very High
    message_body = Column(Text, nullable=False)

    provider = Column(String(40), default="simulated")     # simulated, fast2sms, msg91, twilio
    delivery_status = Column(String(30), default="SENT")  # QUEUED, SENT, DELIVERED, FAILED
    gateway_message_id = Column(String(100), nullable=True)
    gateway_response = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    farm = relationship("Farm", foreign_keys=[farm_id])

    def __repr__(self):
        return (
            f"<SMSLog id={self.id} to={self.mobile_number} "
            f"cat={self.stress_category} status={self.delivery_status}>"
        )
