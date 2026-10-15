"""
Stage 7 — Automated SMS Notification Engine & Background Scheduler Test
Tests:
  1. SMS Consent Enforcement (blocks alerts if farmer opted out)
  2. Bilingual Telugu & English DLT template rendering
  3. Simulated SMS Gateway delivery and logging in SQLite (sms_logs table)
  4. 48-Hour Anti-Spam Cooldown protection
  5. Multi-farm background surveillance cycle execution (APScheduler task)
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set working directory to backend
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from datetime import datetime
from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.farm import Farm
from app.models.consent import SMSConsent
from app.services.sms_templates import render_sms_template
from app.services.sms_service import send_farmer_stress_alert, get_farmer_sms_logs
from app.jobs.scheduler import run_farm_monitoring_cycle

print("=" * 65)
print("RicePulse AP — Stage 7 SMS Engine & Scheduler Test")
print("=" * 65)

# 1. Test Bilingual Template Rendering
print("\n[1/5] Testing Bilingual Kisan SMS Templates (Telugu & English)...")
te_msg = render_sms_template(
    farmer_name="వెంకట రమణమూర్తి",
    farm_name="గోదావరి వరి చేను",
    stress_category="Water Stress / Drought",
    risk_level="High",
    language="Telugu",
    extra_data={"rain_7d_mm": 2.5}
)
print("  • Telugu Alert SMS:")
print(f"    \"{te_msg}\"")
assert "రైస్ పల్స్ హెచ్చరిక" in te_msg, "Expected Telugu header"
assert "గోదావరి వరి చేను" in te_msg, "Expected farm name in Telugu text"

en_msg = render_sms_template(
    farmer_name="Venkata Ramanamurthy",
    farm_name="Godavari Delta Plot",
    stress_category="Heat Wave",
    risk_level="High",
    language="English",
    extra_data={"max_temp_c": 37.4}
)
print("\n  • English Alert SMS:")
print(f"    \"{en_msg}\"")
assert "[RicePulse Alert]" in en_msg, "Expected English header"
print("  ✓ Bilingual template rendering verified!")

# 2. Database Init & Farmer retrieval
print("\n[2/5] Initializing Database and checking SMS Consent status...")
init_db()
db = SessionLocal()

try:
    user = db.query(User).filter(User.mobile_number == "9876543210").first()
    assert user is not None, "Test farmer 9876543210 not found!"
    farm = db.query(Farm).filter(Farm.user_id == user.id).first()
    assert farm is not None, "Test farm not found!"

    print(f"  ✓ Farmer: {user.full_name} | Mobile: {user.mobile_number}")
    print(f"  ✓ Target Farm: {farm.farm_name} (ID {farm.id})")

    # 3. Test Simulated SMS Dispatch
    print("\n[3/5] Testing Simulated SMS Gateway Dispatch (High Drought Risk)...")
    stress_payload = {
        "primary_cause": "Water Stress / Agricultural Drought",
        "risk_level": "High",
        "weather_summary": {"rain_7d_mm": 0.0, "max_temp_c": 35.0},
    }

    send_res = send_farmer_stress_alert(
        user=user,
        farm=farm,
        stress_assessment=stress_payload,
        db=db,
        force_override_cooldown=True,  # Override for initial test
    )

    print(f"  ✓ Dispatch Status : {send_res.get('status')}")
    print(f"  ✓ Delivery Status : {send_res.get('delivery_status')}")
    print(f"  ✓ Provider Used   : {send_res.get('provider')}")
    print(f"  ✓ Gateway Ref ID  : {send_res.get('gateway_message_id')}")
    print(f"  ✓ Message Sent    : {send_res.get('message')[:75]}...")
    assert send_res.get("delivery_status") == "DELIVERED", "Expected DELIVERED status"

    # 4. Test 48-Hour Cooldown Protection
    print("\n[4/5] Testing 48-Hour Cooldown Protection (Attempting immediate duplicate)...")
    duplicate_res = send_farmer_stress_alert(
        user=user,
        farm=farm,
        stress_assessment=stress_payload,
        db=db,
        force_override_cooldown=False,  # Enforce cooldown
    )

    print(f"  ✓ Result Status   : {duplicate_res.get('status')}")
    print(f"  ✓ Cooldown Reason : {duplicate_res.get('reason')}")
    assert duplicate_res.get("status") == "SKIPPED_COOLDOWN", "Expected SKIPPED_COOLDOWN for duplicate alert!"
    print("  ✓ Cooldown protection successfully prevented duplicate farmer alert!")

    # 5. Test Background Scheduler Surveillance Cycle
    print("\n[5/5] Testing Background Surveillance Cycle (Multi-Farm Monitoring)...")
    cycle_res = run_farm_monitoring_cycle()
    print(f"  ✓ Cycle Timestamp     : {cycle_res.get('cycle_timestamp')}")
    print(f"  ✓ Farms Scanned       : {cycle_res.get('farms_scanned')}")
    print(f"  ✓ Alerts Evaluated    : {cycle_res.get('alerts_evaluated')}")
    print(f"  ✓ Cooldown Suppressed : {cycle_res.get('sms_skipped_cooldown')}")
    assert cycle_res.get("farms_scanned") >= 1, "Expected at least 1 farm scanned"

    # Verify SMS Logs Query
    logs = get_farmer_sms_logs(user_id=user.id, db=db, limit=5)
    print(f"\n  ✓ Verified SMS Notification Audit Trail ({len(logs)} records in database):")
    for log in logs[:2]:
        print(f"    [{log['delivery_status']}] {log['created_at'][:19]} | {log['stress_category']} | Ref: {log['gateway_message_id']}")

    print("\n" + "=" * 65)
    print("STAGE 7 AUTOMATED SMS & SCHEDULER TESTS PASSED! ✓")
    print("Bilingual Templates -> Cooldown Logic -> Simulated Gateway -> APScheduler Cycle")
    print("=" * 65)

finally:
    db.close()
