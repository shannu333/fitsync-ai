"""
SMS Notification & Scheduler Router — Stage 7
==============================================
GET  /api/v1/sms/history          — Lists historical Kisan SMS messages sent to the logged-in farmer
POST /api/v1/sms/send-test        — Dispatches a test SMS alert (simulated/live)
POST /api/v1/sms/trigger-cycle    — Manually executes the background surveillance cycle
GET  /api/v1/sms/status           — Returns current SMS gateway mode and scheduler health
"""
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.farm import Farm
from app.services.sms_service import (
    send_farmer_stress_alert,
    get_farmer_sms_logs,
    SMS_PROVIDER,
    COOLDOWN_HOURS,
)
from app.services.stress_engine import evaluate_crop_stress
from app.jobs.scheduler import run_farm_monitoring_cycle, scheduler
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["SMS Notifications"])


@router.get("/history")
def get_sms_history(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns audit trail of all SMS messages dispatched to the current farmer.
    """
    logs = get_farmer_sms_logs(user_id=current_user.id, db=db, limit=limit)
    return {
        "user_id": current_user.id,
        "mobile_number": current_user.mobile_number,
        "preferred_language": current_user.preferred_language,
        "total_messages": len(logs),
        "messages": logs,
    }


@router.post("/send-test")
def send_test_sms(
    farm_id: Optional[int] = Query(None, description="Optional target farm ID"),
    category: str = Query("Water Stress / Agricultural Drought", description="Stress scenario category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispatches a test Kisan SMS to the farmer's mobile number.
    Overrides the 48-hour cooldown for testing/demo purposes.
    """
    # Select farm
    if farm_id:
        farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    else:
        farm = db.query(Farm).filter(Farm.user_id == current_user.id).first()

    if not farm:
        raise HTTPException(status_code=404, detail="No farm found for current user")

    # Mock or evaluate stress
    assessment = {
        "primary_cause": category,
        "risk_level": "High",
        "weather_summary": {"max_temp_c": 36.8, "rain_7d_mm": 2.5},
    }

    result = send_farmer_stress_alert(
        user=current_user,
        farm=farm,
        stress_assessment=assessment,
        db=db,
        force_override_cooldown=True,  # Test endpoint bypasses cooldown
    )

    return result


@router.post("/trigger-cycle")
def trigger_monitoring_cycle(
    current_user: User = Depends(get_current_user),
):
    """
    Manually triggers the background farm surveillance cycle immediately.
    Runs the multi-farm evaluation and dispatches SMS for detected anomalies.
    """
    results = run_farm_monitoring_cycle()
    return results


@router.get("/status")
def get_sms_system_status():
    """
    Returns SMS provider mode (simulated or live) and background scheduler status.
    """
    return {
        "provider": SMS_PROVIDER,
        "mode": "Simulated Gateway (Offline Safe)" if SMS_PROVIDER == "simulated" else f"Live Gateway ({SMS_PROVIDER})",
        "cooldown_hours": COOLDOWN_HOURS,
        "scheduler_running": scheduler.running if scheduler else False,
        "jobs": [
            {"id": j.id, "name": j.name, "next_run_time": j.next_run_time.isoformat() if j.next_run_time else None}
            for j in (scheduler.get_jobs() if scheduler else [])
        ],
    }
