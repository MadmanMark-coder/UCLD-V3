from backend.database.connection import get_ucld_db
from backend import state

VALID_STATUSES = {"available", "in_use", "maintenance", "fault"}

ROOM_PROXIMITY: dict[str, list[str]] = {}

def _build_proximity():
    prefixes = ["201", "202", "203", "204", "301", "302", "303", "401", "402", "501"]
    for p in prefixes:
        rooms = [f"{p}A", f"{p}B", f"{p}C"]
        ROOM_PROXIMITY.update({r: rooms for r in rooms})
    ROOM_PROXIMITY.update({
        "101A": ["101A", "101B"], "101B": ["101A", "101B"],
        "102A": ["102A", "102B"], "102B": ["102A", "102B"],
        "Nurse Station": ["Nurse Station", "201A", "201B", "201C"],
        "Equipment Room": ["Equipment Room", "201A", "202A", "203A", "204A"],
        "Imaging": ["Imaging", "301A", "301B"],
        "Lobby": ["Lobby", "101A", "101B"],
        "Corridor A": ["Corridor A", "101A", "102A"],
        "Corridor B": ["Corridor B", "101B", "102B"],
    })

_build_proximity()

async def get_all_equipment(equip_type: str | None = None, status: str | None = None, department: str | None = None) -> list:
    conditions = []
    params = []
    if equip_type:
        conditions.append("type = ?")
        params.append(equip_type)
    if status:
        conditions.append("status = ?")
        params.append(status)
    if department:
        conditions.append("department = ?")
        params.append(department)
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"SELECT * FROM equipment {where} ORDER BY name ASC"
    async with get_ucld_db() as db:
        rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]

async def get_equipment_stats() -> dict:
    """Return comprehensive equipment statistics."""
    async with get_ucld_db() as db:
        types = ["ventilator", "defibrillator", "infusion_pump", "wheelchair", "ultrasound", "ecg", "oxygen"]
        result = {"total": 0, "available": 0, "in_use": 0, "maintenance": 0, "fault": 0, "by_type": {}, "by_department": {}}

        all_items = await db.execute_fetchall("SELECT * FROM equipment")
        items = [dict(r) for r in all_items]
        result["total"] = len(items)

        for item in items:
            st = item.get("status", "available")
            if st in result:
                result[st] += 1
            tp = item.get("type", "unknown")
            if tp not in result["by_type"]:
                result["by_type"][tp] = {"total": 0, "available": 0, "in_use": 0, "maintenance": 0}
            result["by_type"][tp]["total"] += 1
            if st in result["by_type"][tp]:
                result["by_type"][tp][st] += 1

            dept = item.get("department", "Unknown")
            if dept not in result["by_department"]:
                result["by_department"][dept] = {"total": 0, "in_use": 0}
            result["by_department"][dept]["total"] += 1
            if st == "in_use":
                result["by_department"][dept]["in_use"] += 1

        return result

async def update_status(equip_id: str, new_status: str) -> dict | None:
    if new_status not in VALID_STATUSES:
        return None
    async with get_ucld_db() as db:
        row = await db.execute_fetchall("SELECT * FROM equipment WHERE id = ?", (equip_id,))
        if not row:
            return None
        await db.execute("UPDATE equipment SET status = ? WHERE id = ?", (new_status, equip_id))
        result = dict(row[0])
        result["status"] = new_status
    return result

async def get_nearby_equipment(location: str, equip_type: str, radius: int = 2) -> list:
    nearby_rooms = ROOM_PROXIMITY.get(location, [location])
    placeholders = ",".join("?" for _ in nearby_rooms)
    query = f"""
        SELECT * FROM equipment
        WHERE type = ? AND status = 'available' AND location IN ({placeholders})
        ORDER BY CASE WHEN location = ? THEN 0 ELSE 1 END
        LIMIT 5
    """
    params = [equip_type] + nearby_rooms + [location]
    async with get_ucld_db() as db:
        rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]

async def assign_equipment_to_patient(equip_id: str, patient_id: str) -> dict | None:
    return await update_status(equip_id, "in_use")

async def auto_assign_equipment():
    """Mark a realistic portion of equipment as in_use based on active patients."""
    async with get_ucld_db() as db:
        cohort = state.engine.get_current_patients() if state.engine else []
        if not cohort:
            return {"assigned": 0, "message": "No patients loaded"}

        def unit_match(val, *keywords):
            s = str(val or "").upper()
            return any(k.upper() in s for k in keywords)

        icu_count = sum(1 for p in cohort if unit_match(p.get("first_careunit"), "MICU", "SICU", "CCU", "CVICU", "TSICU", "NEURO SURGICAL"))
        ed_count = sum(1 for p in cohort if unit_match(p.get("first_careunit"), "ED"))
        stepdown_count = sum(1 for p in cohort if unit_match(p.get("first_careunit"), "STEPDOWN", "NEURO INTERMEDIATE", "NEURO STEPDOWN"))

        type_quotas = {
            "ventilator":     min(8,  icu_count),
            "infusion_pump":  min(12, icu_count + stepdown_count),
            "defibrillator":  min(6,  (icu_count + ed_count) // 2),
            "ecg":            min(6,  (icu_count + stepdown_count) // 2),
            "oxygen":         min(4,  len(cohort) // 10),
            "ultrasound":     min(6,  (icu_count + ed_count) // 4),
            "wheelchair":     0,
        }

        assigned = 0
        for equip_type, quota in type_quotas.items():
            if quota <= 0:
                continue
            rows = await db.execute_fetchall(
                "SELECT id FROM equipment WHERE type = ? AND status = 'available' ORDER BY RANDOM() LIMIT ?",
                (equip_type, quota),
            )
            for row in rows:
                await db.execute("UPDATE equipment SET status = 'in_use' WHERE id = ?", (row["id"],))
                assigned += 1

        return {"assigned": assigned, "total_equipment": 50}
