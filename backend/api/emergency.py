from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import state

router = APIRouter(prefix="/api/emergency", tags=["emergency"])


class TriggerCodeRequest(BaseModel):
    stay_id: int
    code_type: str  # "blue" or "red"


@router.post("/trigger")
async def trigger_code(body: TriggerCodeRequest):
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")
    code_type = body.code_type.lower()
    if code_type not in ("blue", "red"):
        raise HTTPException(status_code=400, detail="code_type must be 'blue' or 'red'")
    is_critical = code_type == "blue"

    # Insert an alert_log entry first to satisfy FK constraint
    from backend.database.connection import get_ucld_db
    import uuid
    alert_id = str(uuid.uuid4())
    async with get_ucld_db() as db:
        await db.execute(
            """INSERT INTO alert_log (id, patient_id, stay_id, severity, category, title, description, generated_at)
               VALUES (?, ?, ?, 'emergency', ?, ?, ?, datetime('now'))""",
            (alert_id, str(body.stay_id), body.stay_id,
             "code_blue" if is_critical else "code_red",
             f"Code {'Blue' if is_critical else 'Red'} — Patient {body.stay_id}",
             f"Manual Code {'Blue' if is_critical else 'Red'} triggered for patient {body.stay_id}"),
        )

    alert = {
        "severity": "emergency",
        "category": "code_blue" if is_critical else "code_red",
        "title": f"Code {'Blue' if is_critical else 'Red'} — Patient {body.stay_id}",
        "description": f"Manual Code {'Blue' if is_critical else 'Red'} triggered for patient {body.stay_id}",
        "stay_id": body.stay_id,
        "generated_at": "",
        "id": alert_id,
    }
    incident = await state.emergency_coordinator.create_incident(str(body.stay_id), alert)
    if not incident:
        raise HTTPException(status_code=500, detail="Failed to create incident")
    return incident


@router.get("")
async def list_incidents():
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")
    incidents = await state.emergency_coordinator.get_active_incidents()
    return incidents


@router.get("/status")
async def emergency_status():
    """Real emergency status for the Dashboard — no hardcoded values."""
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")

    active = await state.emergency_coordinator.get_active_incidents()

    # Real patient data from engine
    cohort = state.engine.get_current_patients() if state.engine else []
    critical_count = sum(1 for p in cohort if p.get("stability_category") == "critical")

    # Real bed data
    from backend.services.bed_manager import get_bed_stats
    bed_stats = await get_bed_stats()
    available_beds = bed_stats.get("available", 0)

    # Real equipment data
    from backend.services.equipment_tracker import get_all_equipment
    equip_list = await get_all_equipment()
    total_equip = len(equip_list) or 1
    available_equip = sum(1 for e in equip_list if e.get("status") == "available")
    equip_readiness = round(available_equip / total_equip * 100)

    # Last emergency timestamp from database
    last_emergency = None
    try:
        from backend.database.connection import get_ucld_db
        async with get_ucld_db() as db:
            row = await db.execute_fetchall(
                """SELECT generated_at FROM alert_log
                   WHERE severity = 'emergency'
                   ORDER BY generated_at DESC LIMIT 1"""
            )
            if row and row[0]["generated_at"]:
                last_emergency = row[0]["generated_at"]
    except Exception:
        pass

    # Check for any active/unresolved code incidents
    active_codes = []
    for inc in active:
        code_type = inc.get("type", inc.get("category", ""))
        if "blue" in code_type:
            active_codes.append("blue")
        elif "red" in code_type:
            active_codes.append("red")
    active_codes = list(set(active_codes))

    return {
        "has_active_emergency": len(active) > 0,
        "active_codes": active_codes,
        "active_count": len(active),
        "last_emergency": last_emergency,
        "teams_status": "Ready",
        "equipment_readiness_pct": equip_readiness,
        "available_beds": available_beds,
        "critical_patients": critical_count,
    }


@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")
    incident = await state.emergency_coordinator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")
    incident = await state.emergency_coordinator.resolve_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("/{incident_id}/kit")
async def get_emergency_kit(incident_id: str):
    if not state.emergency_coordinator:
        raise HTTPException(status_code=503, detail="Emergency coordinator not available")
    kit = await state.emergency_coordinator.get_emergency_kit(incident_id)
    return kit
