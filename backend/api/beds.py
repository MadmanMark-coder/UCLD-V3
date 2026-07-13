from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from backend.database.connection import get_ucld_db
from backend.services.bed_manager import (
    get_all_beds, get_bed_stats, assign_bed, release_bed,
    auto_assign_patients, get_bed_occupancy_by_patient,
)
from backend.database.mimic_queries import get_bed_history

router = APIRouter(prefix="/api/beds", tags=["beds"])

class AssignRequest(BaseModel):
    patient_id: str
    stay_id: int

@router.get("")
async def list_beds(department: str | None = Query(None), status: str | None = Query(None)):
    beds = await get_all_beds(department)
    if status:
        beds = [b for b in beds if b.get("status") == status]
    return beds

@router.get("/stats")
async def bed_stats():
    return await get_bed_stats()

@router.post("/auto-assign")
async def auto_assign():
    """Auto-assign all unassigned patients to available beds."""
    return await auto_assign_patients()

@router.get("/occupancy")
async def bed_occupancy():
    """Get bed assignment for every patient."""
    return await get_bed_occupancy_by_patient()

@router.post("/{bed_id}/assign")
async def assign(bed_id: str, body: AssignRequest):
    result = await assign_bed(bed_id, body.patient_id, body.stay_id)
    if result is None:
        raise HTTPException(status_code=400, detail="Bed not available or not found")
    return result

@router.post("/{bed_id}/release")
async def release(bed_id: str):
    result = await release_bed(bed_id)
    if result is None:
        raise HTTPException(status_code=400, detail="Bed not occupied or not found")
    return result

@router.get("/{bed_id}/history")
async def bed_history(bed_id: str):
    async with get_ucld_db() as db:
        row = await db.execute_fetchall("SELECT current_stay_id FROM beds WHERE id = ?", (bed_id,))
        if not row or not row[0]["current_stay_id"]:
            raise HTTPException(status_code=404, detail="No patient assigned to this bed")
        return await get_bed_history(row[0]["current_stay_id"])
