from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from backend.services.equipment_tracker import (
    get_all_equipment, get_equipment_stats, update_status, get_nearby_equipment, assign_equipment_to_patient,
)

router = APIRouter(prefix="/api/equipment", tags=["equipment"])

class StatusRequest(BaseModel):
    status: str

class AssignRequest(BaseModel):
    patient_id: str

@router.get("")
async def list_equipment(type: str | None = Query(None, alias="type"), status: str | None = Query(None), department: str | None = Query(None)):
    return await get_all_equipment(type, status, department)

@router.get("/stats")
async def equipment_stats():
    return await get_equipment_stats()

@router.post("/{equip_id}/status")
async def set_status(equip_id: str, body: StatusRequest):
    result = await update_status(equip_id, body.status)
    if result is None:
        raise HTTPException(status_code=400, detail="Equipment not found or invalid status")
    return result

@router.post("/{equip_id}/assign")
async def assign_equipment(equip_id: str, body: AssignRequest):
    result = await assign_equipment_to_patient(equip_id, body.patient_id)
    if result is None:
        raise HTTPException(status_code=400, detail="Equipment not found")
    return result

@router.get("/nearby")
async def nearby_equipment(location: str = Query(...), type: str = Query(..., alias="type")):
    return await get_nearby_equipment(location, type)
