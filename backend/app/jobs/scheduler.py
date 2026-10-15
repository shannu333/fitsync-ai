"""
Automated Background Scheduler — Stage 7
========================================
Runs periodic background surveillance jobs using APScheduler to:
  1. Poll real weather & Sentinel-2 satellite data for all registered Andhra Pradesh farms.
  2. Automatically trigger crop stress evaluations when new data is received.
  3. Dispatch automated Kisan SMS warnings if Moderate, High, or Very High risk is detected.
  4. Enforce 48-hour cooldown and opt-in consent verification without blocking FastAPI.
"""

import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal
from app.models.farm import Farm
from app.models.user import User
from app.services.stress_engine import evaluate_crop_stress
from app.services.sms_service import send_farmer_stress_alert

logger = logging.getLogger(__name__)

# Global BackgroundScheduler instance
scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def run_farm_monitoring_cycle() -> dict:
    """
    Core batch monitoring task:
    Iterates through all registered rice plots, evaluates stress,
    and dispatches SMS warnings for anomalous conditions.
    """
    logger.info("Executing RicePulse AP background farm monitoring cycle...")
    db = SessionLocal()
    results = {
        "cycle_timestamp": datetime.utcnow().isoformat(),
        "farms_scanned": 0,
        "alerts_evaluated": 0,
        "sms_sent": 0,
        "sms_suppressed_consent": 0,
        "sms_skipped_cooldown": 0,
        "details": [],
    }

    try:
        farms = db.query(Farm).all()
        results["farms_scanned"] = len(farms)

        for farm in farms:
            if not farm.latitude or not farm.longitude:
                continue

            owner = farm.owner
            if not owner:
                continue

            results["alerts_evaluated"] += 1

            # Run stress evaluation
            stress_assessment = evaluate_crop_stress(
                lat=farm.latitude,
                lng=farm.longitude,
                db=db,
                farm_id=farm.id,
                sowing_date=farm.sowing_date,
            )

            risk_level = stress_assessment.get("risk_level", "Low")
            primary_cause = stress_assessment.get("primary_cause", "Optimal")

            # Dispatch SMS if stress detected (Moderate, High, Very High)
            if risk_level in ["Moderate", "High", "Very High"]:
                sms_res = send_farmer_stress_alert(
                    user=owner,
                    farm=farm,
                    stress_assessment=stress_assessment,
                    db=db,
                    force_override_cooldown=False,
                )

                status = sms_res.get("status")
                if status == "SENT":
                    results["sms_sent"] += 1
                elif status == "SUPPRESSED":
                    results["sms_suppressed_consent"] += 1
                elif status == "SKIPPED_COOLDOWN":
                    results["sms_skipped_cooldown"] += 1

                results["details"].append({
                    "farm_id": farm.id,
                    "farm_name": farm.farm_name,
                    "farmer": owner.full_name,
                    "risk_level": risk_level,
                    "primary_cause": primary_cause,
                    "sms_status": status,
                    "reason": sms_res.get("reason"),
                })
            else:
                results["details"].append({
                    "farm_id": farm.id,
                    "farm_name": farm.farm_name,
                    "farmer": owner.full_name,
                    "risk_level": risk_level,
                    "primary_cause": primary_cause,
                    "sms_status": "NONE_HEALTHY",
                })

        logger.info(
            f"Monitoring cycle complete: {results['farms_scanned']} farms scanned, "
            f"{results['sms_sent']} alerts sent, {results['sms_skipped_cooldown']} cooldown skipped."
        )
        return results

    except Exception as e:
        logger.error(f"Error during background farm monitoring cycle: {e}")
        results["error"] = str(e)
        return results
    finally:
        db.close()


def start_scheduler():
    """Initializes and starts the APScheduler background thread."""
    if not scheduler.running:
        # Schedule to run every 6 hours (synchronized with weather/satellite updates)
        scheduler.add_job(
            func=run_farm_monitoring_cycle,
            trigger=IntervalTrigger(hours=6),
            id="farm_monitoring_job",
            name="Periodic Farm Crop Stress & SMS Surveillance Job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler background monitoring service started (6-hour interval).")


def shutdown_scheduler():
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler background monitoring service stopped.")
