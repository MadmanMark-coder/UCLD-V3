from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import state

router = APIRouter(prefix="/api/ai", tags=["ai"])


class QueryRequest(BaseModel):
    query: str
    messages: list[dict] | None = None


class ChatRequest(BaseModel):
    messages: list[dict]


class VoiceRequest(BaseModel):
    text: str
    session_id: str = "default"


@router.post("/summarize/{patient_id}")
async def summarize_patient(patient_id: str):
    if not state.clinical_engine:
        raise HTTPException(status_code=503, detail="Clinical engine not available")
    summary = await state.clinical_engine.generate_patient_summary(patient_id)
    return summary


@router.get("/summary/{patient_id}")
async def get_cached_summary(patient_id: str):
    if not state.clinical_engine:
        raise HTTPException(status_code=503, detail="Clinical engine not available")
    summary = await state.clinical_engine.generate_patient_summary(patient_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No summary found")
    return summary


@router.post("/query")
async def answer_query(body: QueryRequest):
    if not state.operations_copilot:
        raise HTTPException(status_code=503, detail="Operations copilot not available")
    if body.messages:
        response = await state.operations_copilot.chat(body.messages)
    else:
        response = await state.operations_copilot.answer_query(body.query)
    return {"response": response}


@router.post("/chat")
async def chat(body: ChatRequest):
    if not state.operations_copilot:
        raise HTTPException(status_code=503, detail="Operations copilot not available")
    response = await state.operations_copilot.chat(body.messages)
    return {"response": response}





@router.post("/voice")
async def voice_command(body: VoiceRequest):
    if not state.voice_assistant:
        raise HTTPException(status_code=503, detail="Voice assistant not available")
    result = await state.voice_assistant.handle_command(body.text, body.session_id)
    return result


@router.post("/risks/{patient_id}")
async def analyze_risks(patient_id: str):
    if not state.clinical_engine:
        raise HTTPException(status_code=503, detail="Clinical engine not available")
    risks = await state.clinical_engine.analyze_risks(patient_id)
    return risks


@router.post("/deterioration/{patient_id}")
async def detect_deterioration(patient_id: str, hours: int = 6):
    if not state.clinical_engine:
        raise HTTPException(status_code=503, detail="Clinical engine not available")
    history = state.engine.get_patient_vitals_history(int(patient_id), hours=hours) if state.engine else []
    result = await state.clinical_engine.detect_deterioration(patient_id, history)
    return result


@router.post("/status")
async def ai_status():
    if not state.groq_client:
        return {"client": None}
    gc = state.groq_client
    return {
        "key_present": bool(gc.api_key),
        "key_prefix": gc.api_key[:10] if gc.api_key else "none",
        "rate_limited_until": gc._rate_limited_until,
    }
