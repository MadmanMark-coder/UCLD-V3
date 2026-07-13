from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.database.connection import get_ucld_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class BulkAckRequest(BaseModel):
    ids: list[str]


@router.get("")
async def list_alerts(
    patient_id: str | None = Query(None),
    severity: str | None = Query(None),
    acknowledged: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    conditions = []
    params = []

    if patient_id:
        conditions.append("patient_id = ?")
        params.append(patient_id)
    if severity:
        conditions.append("severity = ?")
        params.append(severity)
    if acknowledged is not None:
        conditions.append("acknowledged = ?")
        params.append(1 if acknowledged else 0)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    query = f"SELECT * FROM alert_log {where} ORDER BY priority_score DESC, generated_at DESC LIMIT ?"
    params.append(limit)

    async with get_ucld_db() as db:
        rows = await db.execute_fetchall(query, params)
    return [_row_to_alert(r) for r in rows]


@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    query = "SELECT * FROM alert_log WHERE id = ?"
    async with get_ucld_db() as db:
        rows = await db.execute_fetchall(query, (alert_id,))
        if not rows:
            return {"error": "Alert not found"}
        return _row_to_alert(rows[0])


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    query = "UPDATE alert_log SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?"
    async with get_ucld_db() as db:
        await db.execute(query, (alert_id,))
    return {"status": "acknowledged", "id": alert_id}


@router.post("/acknowledge/bulk")
async def acknowledge_bulk(body: BulkAckRequest):
    if not body.ids:
        return {"status": "ok", "count": 0}
    placeholders = ",".join("?" for _ in body.ids)
    query = f"UPDATE alert_log SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id IN ({placeholders})"
    async with get_ucld_db() as db:
        await db.execute(query, body.ids)
    return {"status": "ok", "count": len(body.ids)}


def _row_to_alert(r) -> dict:
    return {
        "id": r["id"],
        "patient_id": r["patient_id"],
        "stay_id": r["stay_id"],
        "severity": r["severity"],
        "category": r["category"],
        "title": r["title"],
        "description": r["description"],
        "what_changed": r.get("what_changed", ""),
        "why_matters": r.get("why_matters", ""),
        "confidence": r.get("confidence"),
        "next_steps": r.get("next_steps", ""),
        "priority_score": r.get("priority_score", 0),
        "acknowledged": bool(r.get("acknowledged", 0)),
        "generated_at": r.get("generated_at", ""),
    }
