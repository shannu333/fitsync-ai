"""
Administrator Surveillance & System Health Router — Stage 8
============================================================
Endpoints:
  GET  /api/v1/admin/stats            — Aggregated AP state stats (users, farms, districts, consent, SMS)
  GET  /api/v1/admin/users            — Paginated list of registered farmers with farm counts
  GET  /api/v1/admin/api-health       — Live ping & response time test for Copernicus, Open-Meteo, NASA POWER
  GET  /api/v1/admin/scheduler-status — Background surveillance engine status & job schedules
  POST /api/v1/admin/trigger-cycle    — Force immediate background surveillance cycle
  GET  /api/v1/admin/failed-sms       — Audit trail of failed/suppressed Kisan SMS alerts
"""

import time
import logging
from typing import Optional, Dict, Any, List
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.user import User
from app.models.farm import Farm
from app.models.consent import SMSConsent
from app.models.sms_log import SMSNotificationLog
from app.jobs.scheduler import scheduler, run_farm_monitoring_cycle
from app.utils.auth import get_current_user

import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Administrator Dashboard"])

DEFAULT_ADMINS = {"7794933399", "9999999999", "admin"}


def get_authorized_admin_mobiles() -> set:
    """
    Returns set of authorized admin mobile numbers.
    Can be configured in .env with:
      ADMIN_MOBILES="7794933399,9999999999,YOUR_PHONE_NUMBER"
    """
    env_mobiles = os.getenv("ADMIN_MOBILES", "")
    parsed = {m.strip() for m in env_mobiles.split(",") if m.strip()}
    return DEFAULT_ADMINS | parsed


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces administrator role verification."""
    authorized = get_authorized_admin_mobiles()
    if current_user.mobile_number not in authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Mobile number '{current_user.mobile_number}' is not authorized as an administrator. Add it to ADMIN_MOBILES in .env to grant access.",
        )
    return current_user


@router.get("/stats")
def get_admin_system_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Returns high-level statistics across all 13/26 Andhra Pradesh agro-districts,
    including registered farmers, mapped farm hectares, SMS consent status,
    and alert counts.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_farms = db.query(func.count(Farm.id)).scalar() or 0
    total_acres = db.query(func.sum(Farm.area_acres)).scalar() or 0.0

    # User breakdown per district
    users_by_district = dict(
        db.query(User.district, func.count(User.id))
        .group_by(User.district)
        .all()
    )

    # Farms breakdown per district (joined via User since Farm belongs to User)
    farms_by_district = dict(
        db.query(User.district, func.count(Farm.id))
        .join(Farm, Farm.user_id == User.id)
        .group_by(User.district)
        .all()
    )

    # SMS Consent stats
    total_consents_granted = (
        db.query(func.count(SMSConsent.id))
        .filter(SMSConsent.consent_given == True)
        .scalar()
        or 0
    )

    # SMS logs breakdown by status
    sms_status_counts = dict(
        db.query(SMSNotificationLog.delivery_status, func.count(SMSNotificationLog.id))
        .group_by(SMSNotificationLog.delivery_status)
        .all()
    )

    total_sms_sent = sum(sms_status_counts.values())
    failed_sms_count = sms_status_counts.get("FAILED", 0)

    # Stress alerts breakdown by category
    stress_category_counts = dict(
        db.query(SMSNotificationLog.stress_category, func.count(SMSNotificationLog.id))
        .group_by(SMSNotificationLog.stress_category)
        .all()
    )

    all_districts = sorted(list(set(list(users_by_district.keys()) + list(farms_by_district.keys()))))

    return {
        "admin_user": admin.full_name,
        "total_users": total_users,
        "total_farms": total_farms,
        "total_area_acres": round(float(total_acres), 2),
        "total_districts_active": len(all_districts),
        "districts_list": all_districts,
        "users_by_district": users_by_district,
        "farms_by_district": farms_by_district,
        "active_sms_consents": total_consents_granted,
        "total_sms_alerts": total_sms_sent,
        "failed_sms_count": failed_sms_count,
        "sms_by_status": sms_status_counts,
        "alerts_by_stress_category": stress_category_counts,
    }


@router.get("/users")
def get_admin_user_directory(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Returns list of registered farmers with their associated farm count,
    preferred language, and registration timestamp.
    """
    users = (
        db.query(User)
        .order_by(desc(User.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    user_list = []
    for u in users:
        farm_count = db.query(func.count(Farm.id)).filter(Farm.user_id == u.id).scalar() or 0
        consent = db.query(SMSConsent).filter(SMSConsent.user_id == u.id).first()
        user_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "mobile_number": u.mobile_number,
            "district": u.district,
            "mandal": u.mandal,
            "village": u.village,
            "preferred_language": u.preferred_language,
            "is_active": u.is_active,
            "farm_count": farm_count,
            "sms_consent": consent.consent_given if consent else False,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {
        "total": len(user_list),
        "offset": offset,
        "limit": limit,
        "users": user_list,
    }


@router.get("/api-health")
async def check_api_streams_health(
    admin: User = Depends(require_admin),
):
    """
    Tests live connectivity and measures response latencies for all external
    APIs integrated into RicePulse AP:
      1. Open-Meteo Weather API
      2. Copernicus Data Space Ecosystem (CDSE) Sentinel-2 OData
      3. NASA POWER Agroclimatology API
    """
    results: Dict[str, Any] = {}

    # 1. Open-Meteo Health Check
    om_url = "https://api.open-meteo.com/v1/forecast?latitude=16.3067&longitude=80.4365&current_weather=true"
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(om_url)
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            results["open_meteo"] = {
                "name": "Open-Meteo Weather API",
                "status": "UP" if resp.status_code == 200 else "DEGRADED",
                "http_status": resp.status_code,
                "latency_ms": elapsed_ms,
                "endpoint": "https://api.open-meteo.com/v1/forecast",
                "details": "Real-time ERA5 temperature, rain & humidity stream",
            }
    except Exception as exc:
        results["open_meteo"] = {
            "name": "Open-Meteo Weather API",
            "status": "DOWN",
            "http_status": None,
            "latency_ms": None,
            "endpoint": "https://api.open-meteo.com/v1/forecast",
            "error": str(exc),
        }

    # 2. Copernicus CDSE OData API Health Check
    cdse_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=1&$filter=Collection/Name eq 'SENTINEL-2'"
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(cdse_url)
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            results["copernicus_cdse"] = {
                "name": "Copernicus Sentinel-2 CDSE OData",
                "status": "UP" if resp.status_code == 200 else "DEGRADED",
                "http_status": resp.status_code,
                "latency_ms": elapsed_ms,
                "endpoint": "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
                "details": "ESA Sentinel-2 L2A Top-of-Canopy spectral products",
            }
    except Exception as exc:
        results["copernicus_cdse"] = {
            "name": "Copernicus Sentinel-2 CDSE OData",
            "status": "DOWN",
            "http_status": None,
            "latency_ms": None,
            "endpoint": "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
            "error": str(exc),
        }

    # 3. NASA POWER Health Check
    nasa_url = "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=AG&longitude=80.4365&latitude=16.3067&start=20240101&end=20240102&format=JSON"
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(nasa_url)
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            results["nasa_power"] = {
                "name": "NASA POWER Agroclimatology API",
                "status": "UP" if resp.status_code == 200 else "DEGRADED",
                "http_status": resp.status_code,
                "latency_ms": elapsed_ms,
                "endpoint": "https://power.larc.nasa.gov/api/temporal/daily/point",
                "details": "NASA Langley Solar Irradiance and Climatology",
            }
    except Exception as exc:
        results["nasa_power"] = {
            "name": "NASA POWER Agroclimatology API",
            "status": "DOWN",
            "http_status": None,
            "latency_ms": None,
            "endpoint": "https://power.larc.nasa.gov/api/temporal/daily/point",
            "error": str(exc),
        }

    # Overall system health
    all_statuses = [v["status"] for v in results.values()]
    overall = "HEALTHY" if all(s == "UP" for s in all_statuses) else ("DEGRADED" if "UP" in all_statuses else "DOWN")

    return {
        "overall_status": overall,
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "streams": results,
    }


@router.get("/scheduler-status")
def get_scheduler_admin_status(
    admin: User = Depends(require_admin),
):
    """
    Returns live operational state of the APScheduler surveillance engine,
    active job intervals, and next scheduled runs.
    """
    is_running = scheduler.running if scheduler else False
    jobs_info = []
    if scheduler:
        for job in scheduler.get_jobs():
            jobs_info.append({
                "id": job.id,
                "name": job.name,
                "trigger": str(job.trigger),
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            })

    return {
        "scheduler_running": is_running,
        "active_jobs_count": len(jobs_info),
        "jobs": jobs_info,
        "monitoring_interval_hours": 6,
        "target_region": "Andhra Pradesh (All Registered Rice Plots)",
    }


@router.post("/trigger-cycle")
def admin_trigger_monitoring_cycle(
    admin: User = Depends(require_admin),
):
    """
    Forces immediate execution of the background farm surveillance cycle,
    evaluating weather and satellite data for all farms and dispatching alerts.
    """
    results = run_farm_monitoring_cycle()
    results["triggered_by"] = admin.mobile_number
    return results


@router.get("/failed-sms")
def get_failed_sms_audit(
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, description="Optional filter e.g. FAILED, SENT, DELIVERED"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Audits SMS messages with detailed failure reasons or gateway receipts.
    """
    query = db.query(SMSNotificationLog)
    if status_filter:
        query = query.filter(SMSNotificationLog.delivery_status == status_filter.upper())
    else:
        query = query.filter(SMSNotificationLog.delivery_status.in_(["FAILED", "QUEUED"]))

    logs = query.order_by(desc(SMSNotificationLog.created_at)).limit(limit).all()

    return {
        "total_records": len(logs),
        "filter": status_filter or "FAILED/QUEUED",
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "farm_id": log.farm_id,
                "mobile_number": log.mobile_number,
                "language": log.preferred_language,
                "stress_category": log.stress_category,
                "risk_level": log.risk_level,
                "provider": log.provider,
                "delivery_status": log.delivery_status,
                "gateway_response": log.gateway_response,
                "message_body": log.message_body,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }
