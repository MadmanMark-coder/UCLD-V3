import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.config import settings
from backend.database.models import init_ucld_db
from backend.replay.engine import ReplayEngine
from backend.replay.time_manager import TimeManager
from backend.websocket.manager import WSManager
from backend.websocket.handlers import websocket_endpoint
from backend.mimic.cohort_presets import get_cohort_preset
from backend import state
from backend.api import (
    patients,
    vitals,
    alerts,
    beds,
    equipment,
    emergency,
    ai,
    analytics,
    cohort,
    search,
    mimic_data,
    staff,
    notes,
    admin,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting UCLD V3 — Data: %s, %s", settings.MIMIC_DB_PATH, settings.UCLD_DB_PATH)
    await init_ucld_db()
    logger.info("UCLD database initialized and seeded.")

    state.ws_manager = WSManager()
    state.engine = ReplayEngine(state.ws_manager, speed=settings.REPLAY_DEFAULT_SPEED)

    # Initialise AI services
    if settings.AI_API_KEY and settings.AI_API_KEY != "your_groq_api_key_here":
        from backend.services.groq_client import GroqClient
        from backend.services.clinical_engine import ClinicalEngine
        from backend.services.operations_copilot import OperationsCopilot
        from backend.services.voice_assistant import VoiceAssistant
        from backend.services.emergency_coordinator import EmergencyCoordinator

        state.groq_client = GroqClient(settings.AI_API_KEY)
        state.clinical_engine = ClinicalEngine(state.groq_client, state.engine)
        state.operations_copilot = OperationsCopilot(state.groq_client, state.engine)
        state.voice_assistant = VoiceAssistant(state.groq_client, state.engine)
        state.emergency_coordinator = EmergencyCoordinator(state.engine, state.ws_manager)
        state.engine.emergency_coordinator = state.emergency_coordinator
        state.engine._clinical_engine = state.clinical_engine
        logger.info("AI services initialised")
    else:
        logger.warning("AI API key not configured — AI services disabled. Set AI_API_KEY in .env")

    try:
        stay_ids = get_cohort_preset("all")
        await state.engine.load_cohort(stay_ids, "all")
        state.engine.start()
        logger.info("Replay engine started with %d patients", len(stay_ids))
    except Exception as e:
        logger.warning("Could not load default cohort: %s", e)

    try:
        from backend.services.bed_manager import auto_assign_patients
        result = await auto_assign_patients()
        logger.info("Assigned %d patients to beds (%d remaining unassigned)",
                     result["assigned"], result["remaining"])
    except Exception as e:
        logger.warning("Could not auto-assign beds: %s", e)

    try:
        from backend.services.equipment_tracker import auto_assign_equipment
        result = await auto_assign_equipment()
        logger.info("Assigned %d pieces of equipment to patients",
                     result["assigned"])
    except Exception as e:
        logger.warning("Could not auto-assign equipment: %s", e)

    yield

    state.engine.stop()
    logger.info("Shutting down UCLD V3.")


app = FastAPI(title="UCLD V3 — ICU Clinical Decision Support", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "3.0.0",
        "groq_configured": bool(state.groq_client),
    }


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket, state.ws_manager, state.engine)


app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(alerts.router)
app.include_router(beds.router)
app.include_router(equipment.router)
app.include_router(emergency.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(cohort.router)
app.include_router(search.router)
app.include_router(mimic_data.router)
app.include_router(staff.router)
app.include_router(notes.router)
app.include_router(admin.router)


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.WS_HOST,
        port=settings.WS_PORT,
        reload=False,
    )
