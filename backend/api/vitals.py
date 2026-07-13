from fastapi import APIRouter, Query
from backend import state

router = APIRouter(prefix="/api", tags=["vitals"])


@router.get("/patients/{stay_id}/vitals")
async def get_vitals(stay_id: int, hours: int = Query(24, ge=1, le=168)):
    return state.engine.get_patient_vitals_history(stay_id, hours)
