from fastapi import APIRouter
from pydantic import BaseModel
from backend import state
from backend.mimic.cohort_presets import get_cohort_preset

router = APIRouter(prefix="/api/cohort", tags=["cohort"])


class CohortSelectRequest(BaseModel):
    cohort: str


class SpeedRequest(BaseModel):
    speed: int


@router.get("")
async def get_cohort():
    return state.engine.get_status()


@router.post("/select")
async def select_cohort(body: CohortSelectRequest):
    stay_ids = get_cohort_preset(body.cohort)
    await state.engine.load_cohort(stay_ids, body.cohort)
    return state.engine.get_status()


@router.post("/speed")
async def set_speed(body: SpeedRequest):
    state.engine.clock.set_speed(body.speed)
    return state.engine.get_status()
