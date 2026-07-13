import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.database.connection import get_ucld_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/staff", tags=["staff"])

# In-memory staff pool (would be a DB table in production)
AVAILABLE_NURSES = [
    {"id": "N001", "name": "Sarah Chen", "department": "MICU", "workload": 3, "experience": 8, "available": True, "response_time_min": 2},
    {"id": "N002", "name": "James Wilson", "department": "SICU", "workload": 2, "experience": 12, "available": True, "response_time_min": 3},
    {"id": "N003", "name": "Maria Rodriguez", "department": "CCU", "workload": 4, "experience": 6, "available": True, "response_time_min": 4},
    {"id": "N004", "name": "David Kim", "department": "MICU", "workload": 1, "experience": 10, "available": True, "response_time_min": 1},
    {"id": "N005", "name": "Emily Johnson", "department": "ED", "workload": 5, "experience": 5, "available": True, "response_time_min": 5},
    {"id": "N006", "name": "Michael Brown", "department": "TSICU", "workload": 2, "experience": 15, "available": True, "response_time_min": 2},
    {"id": "N007", "name": "Lisa Thompson", "department": "MICU/SICU", "workload": 3, "experience": 7, "available": True, "response_time_min": 3},
    {"id": "N008", "name": "Robert Garcia", "department": "SICU", "workload": 0, "experience": 9, "available": True, "response_time_min": 1},
]

SPECIALISTS = [
    {"id": "S001", "name": "Dr. Ananya Patel", "specialty": "Cardiologist", "available": True, "workload": 2, "est_arrival_min": 10, "rating": 4.9},
    {"id": "S002", "name": "Dr. Thomas Mueller", "specialty": "Neurologist", "available": True, "workload": 1, "est_arrival_min": 15, "rating": 4.8},
    {"id": "S003", "name": "Dr. Yuki Tanaka", "specialty": "Pulmonologist", "available": True, "workload": 3, "est_arrival_min": 12, "rating": 4.7},
    {"id": "S004", "name": "Dr. Catherine O'Brien", "specialty": "Nephrologist", "available": False, "workload": 4, "est_arrival_min": 30, "rating": 4.9},
    {"id": "S005", "name": "Dr. Ahmed Hassan", "specialty": "Intensivist", "available": True, "workload": 0, "est_arrival_min": 5, "rating": 5.0},
    {"id": "S006", "name": "Dr. Olivia Wright", "specialty": "Infectious Disease Specialist", "available": True, "workload": 2, "est_arrival_min": 20, "rating": 4.6},
    {"id": "S007", "name": "Dr. Raj Mehta", "specialty": "Endocrinologist", "available": True, "workload": 1, "est_arrival_min": 25, "rating": 4.5},
    {"id": "S008", "name": "Dr. Sophia Lee", "specialty": "Trauma Surgeon", "available": True, "workload": 0, "est_arrival_min": 8, "rating": 4.9},
]


@router.get("/nurses")
async def list_nurses(department: str = ""):
    if department:
        return [n for n in AVAILABLE_NURSES if department.lower() in n["department"].lower()]
    return AVAILABLE_NURSES


@router.get("/nurses/recommend")
async def recommend_nurses(stay_id: int = 0, severity: str = "stable"):
    from backend import state
    cohort = state.engine.get_current_patients() if state.engine else []
    patient = next((p for p in cohort if p["stay_id"] == stay_id), None)

    # Score nurses by match
    scored = []
    for n in AVAILABLE_NURSES:
        if not n["available"]:
            continue
        score = 100
        # Prefer nurses in same/similar department
        if patient and n["department"] == patient.get("first_careunit", "")[:4]:
            score += 20
        # Prefer experienced for critical
        if severity in ("critical", "emergency") and n["experience"] >= 10:
            score += 15
        # Prefer low workload
        score -= n["workload"] * 5
        # Prefer fast response
        score -= n["response_time_min"]
        scored.append((score, n))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [n for _, n in scored[:5]]


@router.get("/specialists")
async def list_specialists(specialty: str = ""):
    if specialty:
        return [s for s in SPECIALISTS if specialty.lower() in s["specialty"].lower()]
    return SPECIALISTS


@router.get("/specialists/recommend")
async def recommend_specialist(stay_id: int = 0):
    from backend import state
    cohort = state.engine.get_current_patients() if state.engine else []
    patient = next((p for p in cohort if p["stay_id"] == stay_id), None)
    if not patient:
        return SPECIALISTS[:3]

    diag = (patient.get("admission_diagnosis") or "").upper()
    # Map diagnosis codes to recommended specialties
    diag_map = {
        "I": "Cardiologist",
        "J": "Pulmonologist",
        "G": "Neurologist",
        "N": "Nephrologist",
        "A": "Infectious Disease Specialist",
        "E": "Endocrinologist",
        "S": "Trauma Surgeon",
        "T": "Trauma Surgeon",
    }
    first_char = diag[0] if diag else ""
    recommended_spec = diag_map.get(first_char, "Intensivist")

    scored = []
    for s in SPECIALISTS:
        if not s["available"]:
            continue
        score = 50
        if s["specialty"] == recommended_spec:
            score += 30
        score += s["rating"] * 10
        score -= s["workload"] * 5
        scored.append((score, s))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scored[:3]]
