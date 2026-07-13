import uuid
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.database.connection import get_ucld_db
from backend import state
from backend.database.mimic_queries import get_patient_demographics, get_current_vitals, get_diagnoses, get_labs, get_prescriptions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    patient_id: int
    content: str
    category: str = "general"
    author: str = "Dr. Martinez"


class NoteUpdate(BaseModel):
    content: str


class NoteGenerate(BaseModel):
    patient_id: int
    note_type: str = "progress"
    author: str = "Dr. Martinez"


@router.get("")
async def list_notes(patient_id: int = 0, category: str = "", search: str = ""):
    async with get_ucld_db() as db:
        conditions = []
        params = []
        if patient_id:
            conditions.append("patient_id = ?")
            params.append(str(patient_id))
        if category:
            conditions.append("category = ?")
            params.append(category)
        if search:
            conditions.append("(content LIKE ? OR author LIKE ? OR category LIKE ?)")
            s = f"%{search}%"
            params.extend([s, s, s])
        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        rows = await db.execute_fetchall(
            f"SELECT * FROM patient_notes {where} ORDER BY created_at DESC"
        )
    return [dict(r) for r in rows]


@router.post("")
async def create_note(body: NoteCreate):
    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_ucld_db() as db:
        await db.execute(
            """INSERT INTO patient_notes (id, patient_id, content, category, author, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (note_id, str(body.patient_id), body.content, body.category, body.author, now, now),
        )
        await db.commit()
    return {"id": note_id, "created_at": now, "content": body.content, "category": body.category, "author": body.author}


@router.get("/{note_id}")
async def get_note(note_id: str):
    async with get_ucld_db() as db:
        rows = await db.execute_fetchall("SELECT * FROM patient_notes WHERE id = ?", (note_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Note not found")
    return dict(rows[0])


@router.put("/{note_id}")
async def update_note(note_id: str, body: NoteUpdate):
    now = datetime.now(timezone.utc).isoformat()
    async with get_ucld_db() as db:
        await db.execute(
            "UPDATE patient_notes SET content = ?, updated_at = ? WHERE id = ?",
            (body.content, now, note_id),
        )
        await db.commit()
    return {"updated": True}


@router.delete("/{note_id}")
async def delete_note(note_id: str):
    async with get_ucld_db() as db:
        await db.execute("DELETE FROM patient_notes WHERE id = ?", (note_id,))
        await db.commit()
    return {"deleted": True}


async def _fetch_patient_clinical_data(patient_id: str) -> dict:
    engine = state.engine
    cohort_patients = engine.cohort_patients if engine else {}
    patient_info = cohort_patients.get(int(patient_id), {})
    hadm_id = patient_info.get("hadm_id")
    demographics = await get_patient_demographics(int(patient_id)) if hadm_id else patient_info
    vitals = await get_current_vitals(int(patient_id))
    diagnoses = await get_diagnoses(hadm_id) if hadm_id else []
    labs = await get_labs(hadm_id, hours=48) if hadm_id else []
    meds = await get_prescriptions(hadm_id) if hadm_id else []
    return {
        "demographics": demographics,
        "vitals": vitals,
        "diagnoses": diagnoses,
        "labs": labs[-20:] if labs else [],
        "medications": meds[-15:] if meds else [],
        "stability_score": patient_info.get("stability_score", "N/A"),
        "stability_category": patient_info.get("stability_category", "N/A"),
    }


NOTE_PROMPTS = {
    "progress": """Generate a structured SOAP progress note based on the patient's current clinical data. Include:
1. Subjective (inferred from vitals and labs - describe symptoms/status)
2. Objective (include vital signs, lab results, medications)
3. Assessment (key diagnoses, stability status, clinical impression)
4. Plan (recommended next steps, monitoring, treatments)

Format as a professional clinical note with clear sections.""",

    "admission": """Generate a structured Admission Note based on the patient's clinical data. Include:
1. Chief Complaint (inferred from diagnoses and vitals)
2. History of Present Illness
3. Past Medical History (from diagnoses)
4. Medications on Admission
5. Physical Exam Findings (inferred from vitals)
6. Initial Laboratory and Diagnostic Data
7. Assessment and Plan

Format as a professional admission note.""",

    "discharge": """Generate a structured Discharge Summary based on the patient's clinical data. Include:
1. Admission Date and Diagnosis
2. Hospital Course Summary
3. Discharge Diagnoses
4. Procedures and Interventions
5. Discharge Medications
6. Follow-up Plan
7. Discharge Instructions

Format as a professional discharge summary.""",

    "shift_summary": """Generate a structured Shift Summary based on the patient's current clinical data. Include:
1. Patient Status Overview
2. Vital Sign Trends
3. Notable Lab Results
4. Medications Administered
5. Events During Shift
6. Pending Items for Next Shift

Format as a professional shift handoff note.""",

    "summary_24h": """Generate a structured 24-Hour Clinical Summary based on the patient's clinical data. Include:
1. Patient Demographics
2. Current Vitals and Status
3. Recent Lab Results (with notable abnormalities)
4. Current Medications
5. Active Diagnoses
6. Stability Assessment
7. Clinical Impression and Recommendations

Format as a professional clinical summary.""",
}


@router.post("/generate")
async def generate_note(body: NoteGenerate):
    if not state.groq_client:
        raise HTTPException(status_code=503, detail="AI service not available")
    if not state.engine:
        raise HTTPException(status_code=503, detail="Engine not available")
    data = await _fetch_patient_clinical_data(str(body.patient_id))
    prompt_template = NOTE_PROMPTS.get(body.note_type, NOTE_PROMPTS["progress"])
    clinical_context = json.dumps(data, default=str, indent=2)
    messages = [
        {"role": "system", "content": "You are a clinical documentation specialist. Generate structured, professional clinical notes using only the patient data provided. Do not fabricate information. If data is unavailable for a section, state 'Not available in current data.'"},
        {"role": "user", "content": f"{prompt_template}\n\nPatient Clinical Data:\n{clinical_context}\n\nGenerate the clinical note:"},
    ]
    result = await state.groq_client.chat_completion("clinical", messages, max_tokens=1024)
    if not result or not result.get("content"):
        raise HTTPException(status_code=502, detail="AI generation failed - service returned no content")
    content = result["content"].strip()
    if content.startswith("```"):
        lines = content.splitlines()
        in_block = False
        parts = []
        for line in lines:
            if line.strip().startswith("```"):
                in_block = not in_block
                continue
            if in_block:
                parts.append(line)
        content = "\n".join(parts).strip() if parts else content
    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    category = body.note_type
    async with get_ucld_db() as db:
        await db.execute(
            """INSERT INTO patient_notes (id, patient_id, content, category, author, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (note_id, str(body.patient_id), content, category, body.author, now, now),
        )
        await db.commit()
    return {
        "id": note_id,
        "patient_id": str(body.patient_id),
        "content": content,
        "category": category,
        "author": body.author,
        "created_at": now,
        "updated_at": now,
    }
