import os
import json
import uuid
import time
import shutil
import logging
import psutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend import state
from backend.config import settings
from backend.database.connection import get_ucld_db, get_mimic_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

# ======================== In-Memory Stores ========================
USERS_DB: list[dict] = [
    {"id": "U001", "username": "dmartinez", "name": "Dr. Martinez", "role": "doctor", "department": "MICU", "status": "active", "last_login": "2026-06-30T08:00:00Z"},
    {"id": "U002", "username": "nchen", "name": "Sarah Chen", "role": "nurse", "department": "MICU", "status": "active", "last_login": "2026-06-30T07:30:00Z"},
    {"id": "U003", "username": "jwilson", "name": "James Wilson", "role": "nurse", "department": "SICU", "status": "active", "last_login": "2026-06-30T06:45:00Z"},
    {"id": "U004", "username": "apatel", "name": "Dr. Ananya Patel", "role": "specialist", "department": "Cardiology", "status": "active", "last_login": "2026-06-29T14:00:00Z"},
    {"id": "U005", "username": "admin", "name": "System Admin", "role": "admin", "department": "Administration", "status": "active", "last_login": "2026-06-30T09:00:00Z"},
    {"id": "U006", "username": "thassan", "name": "Dr. Ahmed Hassan", "role": "specialist", "department": "ICU", "status": "active", "last_login": "2026-06-30T05:00:00Z"},
    {"id": "U007", "username": "erodriguez", "name": "Maria Rodriguez", "role": "nurse", "department": "CCU", "status": "active", "last_login": "2026-06-29T22:00:00Z"},
    {"id": "U008", "username": "dkim", "name": "David Kim", "role": "nurse", "department": "MICU", "status": "active", "last_login": "2026-06-30T06:00:00Z"},
]

AI_SETTINGS = {
    "clinical_model": "openai/gpt-oss-120b",
    "operations_model": "openai/gpt-oss-20b",
    "voice_model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "confidence_threshold": 0.6,
    "alert_sensitivity": "medium",
    "max_tokens": 1024,
    "temperature": 0.3,
    "enable_ai_summaries": True,
    "enable_risk_analysis": True,
    "enable_deterioration_detection": True,
    "enable_voice_assistant": True,
}

HOSPITAL_CONFIG = {
    "hospital_name": "UCLD Teaching Hospital",
    "total_icu_beds": 30,
    "micu_beds": 12,
    "sicu_beds": 8,
    "ccu_beds": 6,
    "ed_beds": 4,
    "stepdown_beds": 6,
    "emergency_capacity": 4,
    "max_patients_per_nurse": 4,
    "departments": ["MICU", "SICU", "CCU", "ED", "STEPDOWN", "Cardiology", "Neurology", "General Surgery"],
    "auto_assign_beds": True,
    "enable_replay_engine": True,
    "replay_speed": 5,
}

NOTIFICATION_SETTINGS = {
    "email_enabled": True,
    "sms_enabled": False,
    "push_enabled": True,
    "critical_alerts_push": True,
    "daily_summary_enabled": True,
    "alert_cooldown_seconds": 60,
}

AUDIT_LOG: list[dict] = []

BACKUP_DIR = Path(settings.UCLD_DB_PATH).parent / "backups"
BACKUP_DIR.mkdir(exist_ok=True)


# ======================== Models ========================
class UserCreate(BaseModel):
    username: str; name: str; role: str; department: str

class UserUpdate(BaseModel):
    name: str | None = None; role: str | None = None; department: str | None = None; status: str | None = None

class AISettingsUpdate(BaseModel):
    confidence_threshold: float | None = None; alert_sensitivity: str | None = None
    max_tokens: int | None = None; temperature: float | None = None
    enable_ai_summaries: bool | None = None; enable_risk_analysis: bool | None = None
    enable_deterioration_detection: bool | None = None

class HospitalConfigUpdate(BaseModel):
    hospital_name: str | None = None; auto_assign_beds: bool | None = None
    max_patients_per_nurse: int | None = None; replay_speed: int | None = None

class NotificationUpdate(BaseModel):
    email_enabled: bool | None = None; sms_enabled: bool | None = None
    push_enabled: bool | None = None; critical_alerts_push: bool | None = None
    daily_summary_enabled: bool | None = None; alert_cooldown_seconds: int | None = None


def _log_audit(action: str, user: str, detail: str):
    AUDIT_LOG.insert(0, {
        "id": str(uuid.uuid4())[:8], "action": action, "user": user,
        "detail": detail, "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": "127.0.0.1",
    })
    if len(AUDIT_LOG) > 500:
        AUDIT_LOG[:] = AUDIT_LOG[:500]


# ======================== Endpoints ========================

# -- User Management --
@router.get("/users")
async def list_users(role: str = "", department: str = ""):
    users = USERS_DB
    if role: users = [u for u in users if u["role"] == role]
    if department: users = [u for u in users if u["department"].lower() == department.lower()]
    return {"users": users, "total": len(users)}

@router.post("/users")
async def create_user(body: UserCreate):
    uid = f"U{len(USERS_DB)+1:03d}"
    user = {"id": uid, "username": body.username, "name": body.name, "role": body.role,
            "department": body.department, "status": "active", "last_login": None}
    USERS_DB.append(user)
    _log_audit("USER_CREATED", "admin", f"Created user {body.username} ({body.role})")
    return user

@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate):
    for u in USERS_DB:
        if u["id"] == user_id:
            if body.name is not None: u["name"] = body.name
            if body.role is not None: u["role"] = body.role
            if body.department is not None: u["department"] = body.department
            if body.status is not None: u["status"] = body.status
            _log_audit("USER_UPDATED", "admin", f"Updated user {user_id}")
            return u
    raise HTTPException(404, "User not found")

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    global USERS_DB
    USERS_DB = [u for u in USERS_DB if u["id"] != user_id]
    _log_audit("USER_DELETED", "admin", f"Deleted user {user_id}")
    return {"deleted": True}

# -- AI Settings --
@router.get("/ai-settings")
async def get_ai_settings():
    return AI_SETTINGS

@router.put("/ai-settings")
async def update_ai_settings(body: AISettingsUpdate):
    if body.confidence_threshold is not None: AI_SETTINGS["confidence_threshold"] = body.confidence_threshold
    if body.alert_sensitivity is not None: AI_SETTINGS["alert_sensitivity"] = body.alert_sensitivity
    if body.max_tokens is not None: AI_SETTINGS["max_tokens"] = body.max_tokens
    if body.temperature is not None: AI_SETTINGS["temperature"] = body.temperature
    if body.enable_ai_summaries is not None: AI_SETTINGS["enable_ai_summaries"] = body.enable_ai_summaries
    if body.enable_risk_analysis is not None: AI_SETTINGS["enable_risk_analysis"] = body.enable_risk_analysis
    if body.enable_deterioration_detection is not None: AI_SETTINGS["enable_deterioration_detection"] = body.enable_deterioration_detection
    _log_audit("AI_SETTINGS_UPDATED", "admin", f"Updated AI configuration")
    return AI_SETTINGS

# -- Hospital Configuration --
@router.get("/hospital-config")
async def get_hospital_config():
    return HOSPITAL_CONFIG

@router.put("/hospital-config")
async def update_hospital_config(body: HospitalConfigUpdate):
    if body.hospital_name is not None: HOSPITAL_CONFIG["hospital_name"] = body.hospital_name
    if body.auto_assign_beds is not None: HOSPITAL_CONFIG["auto_assign_beds"] = body.auto_assign_beds
    if body.max_patients_per_nurse is not None: HOSPITAL_CONFIG["max_patients_per_nurse"] = body.max_patients_per_nurse
    if body.replay_speed is not None:
        HOSPITAL_CONFIG["replay_speed"] = body.replay_speed
        if state.engine: state.engine.clock._speed = body.replay_speed
    _log_audit("HOSPITAL_CONFIG_UPDATED", "admin", "Updated hospital configuration")
    return HOSPITAL_CONFIG

# -- Notification Settings --
@router.get("/notifications")
async def get_notification_settings():
    return NOTIFICATION_SETTINGS

@router.put("/notifications")
async def update_notification_settings(body: NotificationUpdate):
    if body.email_enabled is not None: NOTIFICATION_SETTINGS["email_enabled"] = body.email_enabled
    if body.sms_enabled is not None: NOTIFICATION_SETTINGS["sms_enabled"] = body.sms_enabled
    if body.push_enabled is not None: NOTIFICATION_SETTINGS["push_enabled"] = body.push_enabled
    if body.critical_alerts_push is not None: NOTIFICATION_SETTINGS["critical_alerts_push"] = body.critical_alerts_push
    if body.daily_summary_enabled is not None: NOTIFICATION_SETTINGS["daily_summary_enabled"] = body.daily_summary_enabled
    if body.alert_cooldown_seconds is not None: NOTIFICATION_SETTINGS["alert_cooldown_seconds"] = body.alert_cooldown_seconds
    _log_audit("NOTIFICATION_SETTINGS_UPDATED", "admin", "Updated notification preferences")
    return NOTIFICATION_SETTINGS

# -- Security Audit Log --
@router.get("/audit-log")
async def get_audit_log(limit: int = Query(50, ge=1, le=500), action: str = ""):
    entries = AUDIT_LOG
    if action: entries = [e for e in entries if e["action"] == action]
    return {"entries": entries[:limit], "total": len(AUDIT_LOG)}

# -- System Monitoring --
@router.get("/system-status")
async def get_system_status():
    cpu = 0; mem_pct = 0; mem_used = 0; mem_total = 0; disk_pct = 0; boot_time = "N/A"
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        mem_pct = mem.percent; mem_used = mem.used; mem_total = mem.total
        disk = psutil.disk_usage("/")
        disk_pct = disk.percent
        boot_time = datetime.fromtimestamp(psutil.boot_time()).isoformat()
    except Exception:
        pass

    db_ok = False; mimic_db_ok = False; ucld_count = 0; mimic_count = 0
    try:
        async with get_ucld_db() as db:
            r = await db.execute_fetchall("SELECT COUNT(*) AS c FROM alert_log")
            ucld_count = r[0]["c"] if r else 0
            db_ok = True
    except Exception:
        pass
    try:
        async with get_mimic_db() as db:
            r = await db.execute_fetchall('SELECT COUNT(*) AS c FROM "hosp.patients"')
            mimic_count = r[0]["c"] if r else 0
            mimic_db_ok = True
    except Exception:
        pass

    cohort = state.engine.get_current_patients() if state.engine else []
    return {
        "api_status": "operational",
        "database_status": "connected" if db_ok else "error",
        "mimic_database_status": "connected" if mimic_db_ok else "error",
        "ai_status": "configured" if bool(state.groq_client) else "not_configured",
        "replay_status": state.engine.get_status() if state.engine else {"status": "stopped"},
        "server": {
            "uptime": boot_time,
            "cpu_percent": round(cpu, 1),
            "memory_percent": round(mem_pct, 1),
            "memory_used_gb": round(mem_used / (1024**3), 2),
            "memory_total_gb": round(mem_total / (1024**3), 2),
            "disk_percent": round(disk_pct, 1),
        },
        "database": {
            "ucld_alerts": ucld_count,
            "mimic_patients": mimic_count,
            "active_patients": len(cohort),
            "cohort_patients": len(state.engine.cohort_patients) if state.engine else 0,
            "timeline_events": len(state.engine.timeline) if state.engine else 0,
        },
        "groq_usage": {
            "clinical_model": AI_SETTINGS["clinical_model"],
            "operations_model": AI_SETTINGS["operations_model"],
            "voice_model": AI_SETTINGS["voice_model"],
        },
    }

# -- Backup & Recovery --
@router.post("/backup")
async def create_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"ucld_backup_{timestamp}.db"
    backup_path = BACKUP_DIR / backup_name
    try:
        src = Path(state.settings.UCLD_DB_PATH)
        if src.exists():
            shutil.copy2(src, backup_path)
            _log_audit("BACKUP_CREATED", "admin", f"Backup created: {backup_name}")
            return {"backup": backup_name, "path": str(backup_path), "created_at": timestamp}
        raise HTTPException(400, "Source database not found")
    except Exception as e:
        raise HTTPException(500, f"Backup failed: {e}")

@router.get("/backups")
async def list_backups():
    backups = []
    for f in sorted(BACKUP_DIR.glob("ucld_backup_*.db"), reverse=True):
        backups.append({"name": f.name, "size_kb": round(f.stat().st_size / 1024, 1), "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()})
    return {"backups": backups}

@router.post("/restore")
async def restore_backup(backup_name: str = Query(...)):
    backup_path = BACKUP_DIR / backup_name
    if not backup_path.exists():
        raise HTTPException(404, "Backup not found")
    try:
        src = Path(state.settings.UCLD_DB_PATH)
        shutil.copy2(backup_path, src)
        _log_audit("BACKUP_RESTORED", "admin", f"Restored from: {backup_name}")
        return {"restored": True, "from": backup_name}
    except Exception as e:
        raise HTTPException(500, f"Restore failed: {e}")

@router.get("/export")
async def export_data():
    """Export key data as JSON for download."""
    cohort = state.engine.get_current_patients() if state.engine else []
    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "hospital": HOSPITAL_CONFIG["hospital_name"],
        "patients": len(cohort),
        "patient_summary": [{"stay_id": p["stay_id"], "subject_id": p.get("subject_id"), "stability_score": p.get("stability_score"), "stability_category": p.get("stability_category")} for p in cohort[:50]],
        "users": len(USERS_DB),
        "ai_settings": AI_SETTINGS,
    }
    return data
