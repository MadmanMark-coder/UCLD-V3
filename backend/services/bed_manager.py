from backend.database.connection import get_ucld_db
from backend import state

async def get_all_beds(department: str | None = None) -> list:
    query = "SELECT * FROM beds"
    params = []
    if department:
        query += " WHERE department = ?"
        params.append(department)
    query += " ORDER BY room_number ASC"
    async with get_ucld_db() as db:
        rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]

async def get_bed_stats() -> dict:
    async with get_ucld_db() as db:
        total = await db.execute_fetchall("SELECT COUNT(*) AS c FROM beds")
        total = total[0]["c"] if total else 0
        stats = {"total": total, "available": 0, "occupied": 0, "cleaning": 0, "reserved": 0}
        by_dept = {}

        rows = await db.execute_fetchall("SELECT status, department, COUNT(*) AS c FROM beds GROUP BY status, department")
        for r in rows:
            dept = r["department"]
            status = r["status"]
            cnt = r["c"]
            if status in stats:
                stats[status] += cnt
            if dept not in by_dept:
                by_dept[dept] = {"total": 0, "available": 0, "occupied": 0, "cleaning": 0, "reserved": 0}
            by_dept[dept]["total"] += cnt
            if status in by_dept[dept]:
                by_dept[dept][status] += cnt

        dept_totals = await db.execute_fetchall("SELECT department, COUNT(*) AS c FROM beds GROUP BY department")
        for r in dept_totals:
            if r["department"] not in by_dept:
                by_dept[r["department"]] = {"total": r["c"], "available": 0, "occupied": 0, "cleaning": 0, "reserved": 0}

    stats["by_department"] = by_dept
    stats["occupancy_pct"] = round(stats["occupied"] / max(total, 1) * 100, 1)
    return stats

async def auto_assign_patients():
    """Auto-assign all unassigned patients to available beds by department."""
    async with get_ucld_db() as db:
        beds = await db.execute_fetchall(
            "SELECT * FROM beds WHERE status = 'available' ORDER BY CASE department WHEN 'MICU' THEN 0 WHEN 'SICU' THEN 1 WHEN 'CCU' THEN 2 WHEN 'ED' THEN 3 WHEN 'STEPDOWN' THEN 4 ELSE 5 END, room_number"
        )
        cohort = state.engine.get_current_patients() if state.engine else []

        patients_to_assign = [p for p in cohort
                             if not await db.execute_fetchall(
                                 "SELECT id FROM beds WHERE current_stay_id = ?", (p["stay_id"],)
                             )]

        assignments = []
        for bed_row in beds:
            if not patients_to_assign:
                break
            bed = dict(bed_row)
            patient = patients_to_assign.pop(0)
            await db.execute(
                "UPDATE beds SET status = 'occupied', current_patient_id = ?, current_stay_id = ? WHERE id = ?",
                (str(patient["subject_id"]), patient["stay_id"], bed["id"]),
            )
            assignments.append({"bed_id": bed["id"], "patient_id": patient["stay_id"], "room": bed["room_number"]})

        return {"assigned": len(assignments), "remaining": len(patients_to_assign), "assignments": assignments}

async def assign_bed(bed_id: str, patient_id: str, stay_id: int) -> dict | None:
    async with get_ucld_db() as db:
        row = await db.execute_fetchall("SELECT * FROM beds WHERE id = ?", (bed_id,))
        if not row:
            return None
        bed = dict(row[0])
        if bed["status"] != "available":
            return None
        await db.execute(
            "UPDATE beds SET status = 'occupied', current_patient_id = ?, current_stay_id = ? WHERE id = ?",
            (patient_id, stay_id, bed_id),
        )
        bed["status"] = "occupied"
        bed["current_patient_id"] = patient_id
        bed["current_stay_id"] = stay_id
    return bed

async def release_bed(bed_id: str) -> dict | None:
    async with get_ucld_db() as db:
        row = await db.execute_fetchall("SELECT * FROM beds WHERE id = ?", (bed_id,))
        if not row:
            return None
        bed = dict(row[0])
        if bed["status"] != "occupied":
            return None
        await db.execute(
            "UPDATE beds SET status = 'available', current_patient_id = NULL, current_stay_id = NULL WHERE id = ?",
            (bed_id,),
        )
        bed["status"] = "available"
        bed["current_patient_id"] = None
        bed["current_stay_id"] = None
    return bed

async def get_bed_occupancy_by_patient():
    """Get bed assignment for every patient in the cohort."""
    cohort = state.engine.get_current_patients() if state.engine else []
    async with get_ucld_db() as db:
        beds = await db.execute_fetchall("SELECT * FROM beds WHERE current_stay_id IS NOT NULL")
        bed_map = {r["current_stay_id"]: dict(r) for r in beds}

    result = []
    for p in cohort:
        bed = bed_map.get(p["stay_id"])
        result.append({
            "stay_id": p["stay_id"],
            "subject_id": p.get("subject_id"),
            "stability_category": p.get("stability_category"),
            "bed": bed,
            "has_bed": bed is not None,
        })
    return result
