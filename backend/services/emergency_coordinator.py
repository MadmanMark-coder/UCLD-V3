import uuid
import json
import logging
from datetime import datetime, timezone

from backend.database.connection import get_ucld_db
from backend.services.equipment_tracker import get_nearby_equipment

logger = logging.getLogger(__name__)

EMERGENCY_SEVERITIES = {"emergency", "critical"}


class EmergencyCoordinator:
    def __init__(self, engine, ws_manager):
        self.engine = engine
        self.ws_manager = ws_manager

    async def create_incident(self, patient_id: str, alert: dict) -> dict | None:
        severity = alert.get("severity", "")
        if severity not in EMERGENCY_SEVERITIES:
            return None

        category = alert.get("category", "")
        if severity == "critical" and category != "pattern":
            return None

        incident_id = str(uuid.uuid4())
        incident = {
            "id": incident_id,
            "patient_id": patient_id,
            "stay_id": alert.get("stay_id", 0),
            "type": alert.get("category", "threshold"),
            "status": "detected",
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "resolved_at": None,
            "timeline": json.dumps([f"{alert.get('title', 'Alert triggered')} at {alert.get('generated_at', '')}"]),
            "summary": alert.get("description", ""),
            "alert_id": alert.get("id", ""),
        }

        try:
            async with get_ucld_db() as db:
                await db.execute(
                    """INSERT INTO incidents (id, patient_id, stay_id, type, status, detected_at, timeline, summary, alert_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (incident["id"], incident["patient_id"], incident["stay_id"],
                     incident["type"], incident["status"], incident["detected_at"],
                     incident["timeline"], incident["summary"], incident["alert_id"]),
                )
        except Exception as e:
            logger.warning("Failed to create incident: %s", e)
            return None

        await self.ws_manager.broadcast("EMERGENCY_START", incident)
        logger.info("Emergency incident created: %s for patient %s", incident_id, patient_id)
        return incident

    async def get_active_incidents(self) -> list[dict]:
        query = """SELECT * FROM incidents WHERE status != 'resolved' ORDER BY detected_at DESC"""
        try:
            async with get_ucld_db() as db:
                rows = await db.execute_fetchall(query)
            return [self._row_to_incident(r) for r in rows]
        except Exception as e:
            logger.warning("Failed to fetch incidents: %s", e)
            return []

    async def get_incident(self, incident_id: str) -> dict | None:
        query = "SELECT * FROM incidents WHERE id = ?"
        try:
            async with get_ucld_db() as db:
                rows = await db.execute_fetchall(query, (incident_id,))
                if rows:
                    return self._row_to_incident(rows[0])
            return None
        except Exception as e:
            logger.warning("Failed to fetch incident %s: %s", incident_id, e)
            return None

    async def resolve_incident(self, incident_id: str) -> dict | None:
        incident = await self.get_incident(incident_id)
        if not incident:
            return None

        now = datetime.now(timezone.utc).isoformat()
        try:
            async with get_ucld_db() as db:
                await db.execute(
                    "UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ?",
                    (now, incident_id),
                )
        except Exception as e:
            logger.warning("Failed to resolve incident %s: %s", incident_id, e)
            return None

        incident["status"] = "resolved"
        incident["resolved_at"] = now
        await self.ws_manager.broadcast("EMERGENCY_RESOLVE", {"incident_id": incident_id})
        logger.info("Emergency incident resolved: %s", incident_id)
        return incident

    async def get_emergency_kit(self, incident_id: str) -> dict:
        incident = await self.get_incident(incident_id)
        if not incident:
            return {"error": "Incident not found"}

        patient_id = incident.get("patient_id", "")
        stay_id = incident.get("stay_id", 0)
        patients = self.engine.get_current_patients()
        patient = next((p for p in patients if str(p["stay_id"]) == patient_id or p.get("stay_id") == stay_id), None)

        location = "201A"
        if patient:
            from backend.services.bed_manager import get_all_beds
            beds = await get_all_beds()
            patient_bed = next((b for b in beds if b.get("current_patient_id") == patient_id or b.get("current_stay_id") == stay_id), None)
            if patient_bed:
                location = patient_bed.get("room_number", location)

        nearby_defib = await get_nearby_equipment(location, "defibrillator")
        nearby_vent = await get_nearby_equipment(location, "ventilator")
        nearby_oxygen = await get_nearby_equipment(location, "oxygen")

        kit = {
            "incident_id": incident_id,
            "patient_location": location,
            "defibrillators": [dict(d) for d in nearby_defib] if nearby_defib else [],
            "ventilators": [dict(v) for v in nearby_vent] if nearby_vent else [],
            "oxygen_tanks": [dict(o) for o in nearby_oxygen] if nearby_oxygen else [],
        }
        return kit

    def _row_to_incident(self, r) -> dict:
        d = dict(r)
        return {
            "id": d["id"],
            "patient_id": d["patient_id"],
            "stay_id": d["stay_id"],
            "type": d["type"],
            "status": d["status"],
            "detected_at": d.get("detected_at", ""),
            "resolved_at": d.get("resolved_at"),
            "timeline": json.loads(d["timeline"]) if isinstance(d.get("timeline"), str) else (d.get("timeline") or []),
            "summary": d.get("summary", ""),
            "alert_id": d.get("alert_id", ""),
        }
