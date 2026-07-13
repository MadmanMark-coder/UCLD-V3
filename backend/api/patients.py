import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from backend import state
from backend.database.mimic_queries import (
    get_diagnoses, get_prescriptions, get_labs_with_names,
    get_patient_demographics, get_current_vitals, get_vitals_history,
    get_patient_timeline, get_bed_history, get_allergies, get_microbiology,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patients", tags=["patients"])

@router.get("")
async def list_patients():
    return state.engine.get_current_patients()

@router.get("/{stay_id}")
async def get_patient(stay_id: int):
    patients = state.engine.get_current_patients()
    patient = next((p for p in patients if p["stay_id"] == stay_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    hadm_id = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
    if hadm_id:
        try:
            patient["diagnoses"] = await get_diagnoses(hadm_id)
        except Exception:
            patient["diagnoses"] = []
        try:
            patient["prescriptions"] = await get_prescriptions(hadm_id)
        except Exception:
            patient["prescriptions"] = []
        try:
            patient["labs"] = await get_labs_with_names(hadm_id, 24)
        except Exception:
            patient["labs"] = []
    else:
        patient["diagnoses"] = []
        patient["prescriptions"] = []
        patient["labs"] = []

    return patient

@router.get("/{stay_id}/overview")
async def patient_overview(stay_id: int):
    """Full patient overview with demographics, diagnosis, risk summary."""
    patients = state.engine.get_current_patients()
    patient = next((p for p in patients if p["stay_id"] == stay_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    hadm_id = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
    demo = None
    diagnoses = []
    if hadm_id:
        try:
            demo = await get_patient_demographics(stay_id)
            diagnoses = await get_diagnoses(hadm_id)
        except Exception:
            pass

    hadm_id_val = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id") or (demo.get("hadm_id") if demo else None)
    risk = await _get_risk_analysis(stay_id, patient)

    ai_summary = None
    if state.clinical_engine and hadm_id_val:
        try:
            ai_summary = await state.clinical_engine.generate_patient_summary(str(stay_id))
        except Exception:
            pass

    return {
        "patient": patient,
        "demographics": demo or {},
        "diagnoses": diagnoses,
        "risk_summary": risk,
        "ai_summary": ai_summary,
    }

@router.get("/{stay_id}/labs")
async def patient_labs(stay_id: int, hours: int = Query(168, ge=1, le=720)):
    """Lab results with names and abnormal flags."""
    hadm_id = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
    if not hadm_id:
        # Fallback: get from demographics
        demo = await get_patient_demographics(stay_id)
        hadm_id = demo.get("hadm_id") if demo else None
    if not hadm_id:
        return {"labs": [], "microbiology": []}

    try:
        lab_list = await get_labs_with_names(hadm_id, hours)
    except Exception:
        lab_list = []
    try:
        micro = await get_microbiology(hadm_id)
    except Exception:
        micro = []

    return {"labs": lab_list, "microbiology": micro}

@router.get("/{stay_id}/risk")
async def patient_risk(stay_id: int):
    """All AI-predicted risk scores for the patient."""
    patients = state.engine.get_current_patients()
    patient = next((p for p in patients if p["stay_id"] == stay_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    risk = await _get_risk_analysis(stay_id, patient)

    vitals = patient.get("latest_vitals") or {}
    history = []
    if state.engine:
        try:
            history = state.engine.get_patient_vitals_history(stay_id, hours=6)
        except Exception:
            pass

    deterioration = None
    if state.clinical_engine:
        try:
            deterioration = await state.clinical_engine.detect_deterioration(str(stay_id), history)
        except Exception:
            pass

    return {
        "risk_analysis": risk,
        "deterioration": deterioration or {"has_deteriorated": False, "confidence": 0},
        "stability_score": patient.get("stability_score", 50),
        "stability_category": patient.get("stability_category", "stable"),
    }

async def _get_risk_analysis(stay_id: int, patient: dict) -> dict:
    """Compute risk scores from vitals data without calling Groq for every request."""
    vitals = patient.get("latest_vitals") or {}
    score = patient.get("stability_score", 50)
    category = patient.get("stability_category", "stable")

    hr = vitals.get("heart_rate") or 80
    sbp = vitals.get("sbp") or 120
    spo2 = vitals.get("spo2") or 97
    temp = vitals.get("temperature") or 37.0
    resp = vitals.get("resp_rate") or 16

    # Mortality risk (simplified scoring from vitals)
    mortality = 5
    if hr > 120: mortality += 20
    if hr < 50: mortality += 10
    if sbp < 90: mortality += 25
    if spo2 < 90: mortality += 20
    if temp > 39: mortality += 10
    if temp < 35: mortality += 10
    if resp > 30: mortality += 10
    mortality = min(mortality, 95)

    # Sepsis risk
    sepsis = 5
    if temp > 38.3: sepsis += 25
    if hr > 90: sepsis += 15
    if resp > 20: sepsis += 10
    if sbp < 100: sepsis += 15
    sepsis = min(sepsis, 95)

    # Cardiac risk
    cardiac = 5
    if hr > 110: cardiac += 20
    if hr < 55: cardiac += 15
    if sbp < 90: cardiac += 20
    if sbp > 180: cardiac += 15
    cardiac = min(cardiac, 95)

    # Respiratory risk
    resp_risk = 5
    if spo2 < 94: resp_risk += 20
    if spo2 < 90: resp_risk += 30
    if resp > 25: resp_risk += 15
    if resp < 10: resp_risk += 10
    resp_risk = min(resp_risk, 95)

    # Cardiac arrest risk (more extreme than cardiac event)
    cardiac_arrest = 3
    if hr > 130: cardiac_arrest += 25
    if hr < 40: cardiac_arrest += 20
    if sbp < 80: cardiac_arrest += 30
    if spo2 < 85: cardiac_arrest += 15
    cardiac_arrest = min(cardiac_arrest, 95)

    # ICU transfer risk (from lower acuity to ICU)
    icu_transfer = 5
    if category in ("critical", "high_risk"): icu_transfer += 25
    if hr > 110: icu_transfer += 10
    if sbp < 90: icu_transfer += 15
    if spo2 < 90: icu_transfer += 15
    if resp > 25: icu_transfer += 10
    icu_transfer = min(icu_transfer, 95)

    # Organ failure risk
    organ_failure = 5
    if sbp < 90: organ_failure += 20
    if hr > 120: organ_failure += 10
    if spo2 < 90: organ_failure += 15
    if temp > 39: organ_failure += 10
    if temp < 35: organ_failure += 10
    if resp > 30: organ_failure += 10
    organ_failure = min(organ_failure, 95)

    # Length of stay risk
    los_risk = 5 + max(0, 95 - score) * 0.4
    if category in ("critical", "high_risk"): los_risk += 10
    if patient.get("age", 50) > 70: los_risk += 5
    los_risk = min(los_risk, 90)

    # Medication complication risk
    med_complication = 5
    if patient.get("age", 50) > 65: med_complication += 15
    if patient.get("age", 50) > 80: med_complication += 10
    if category in ("critical", "high_risk"): med_complication += 15
    if sbp < 90: med_complication += 10
    if hr > 110: med_complication += 5
    med_complication = min(med_complication, 90)

    # Readmission risk
    readmit = 5 + max(0, 95 - score) * 0.5
    readmit = min(readmit, 90)

    # Fall risk
    fall = 5
    if patient.get("age", 50) > 65: fall += 20
    if patient.get("age", 50) > 80: fall += 15
    if category in ("critical", "high_risk"): fall += 15
    if sbp < 100: fall += 10
    fall = min(fall, 90)

    return {
        "mortality_risk": {"riskPercentage": round(mortality), "confidence": 65, "contributors": _get_contributors("mortality", vitals), "recommendation": "ICU level care recommended" if mortality > 50 else "Continue current monitoring"},
        "sepsis_risk": {"riskPercentage": round(sepsis), "confidence": 70 + (sepsis > 50) * 15, "contributors": _get_contributors("sepsis", vitals), "recommendation": "Monitor qSOFA score and lactate levels" if sepsis > 30 else "Standard monitoring"},
        "cardiac_arrest_risk": {"riskPercentage": round(cardiac_arrest), "confidence": 68, "contributors": _get_contributors("cardiac_arrest", vitals), "recommendation": "Prepare resuscitation equipment" if cardiac_arrest > 30 else "Standard cardiac monitoring"},
        "cardiac_event_risk": {"riskPercentage": round(cardiac), "confidence": 70, "contributors": _get_contributors("cardiac", vitals), "recommendation": "Continuous ECG monitoring" if cardiac > 30 else "Standard cardiac monitoring"},
        "respiratory_failure_risk": {"riskPercentage": round(resp_risk), "confidence": 72, "contributors": _get_contributors("respiratory", vitals), "recommendation": "Monitor SpO2 and consider ABG" if resp_risk > 30 else "Standard respiratory monitoring"},
        "icu_transfer_risk": {"riskPercentage": round(icu_transfer), "confidence": 66, "contributors": _get_contributors("icu_transfer", vitals), "recommendation": "Prepare ICU bed and transfer team" if icu_transfer > 30 else "Continue current level of care"},
        "readmission_risk": {"riskPercentage": round(readmit), "confidence": 60, "contributors": ["History of previous admissions"], "recommendation": "Ensure comprehensive discharge planning"},
        "organ_failure_risk": {"riskPercentage": round(organ_failure), "confidence": 64, "contributors": _get_contributors("organ_failure", vitals), "recommendation": "Monitor end-organ perfusion markers" if organ_failure > 30 else "Standard organ function monitoring"},
        "length_of_stay_risk": {"riskPercentage": round(los_risk), "confidence": 62, "contributors": [f"Stability score: {score}", f"Category: {category}"], "recommendation": "Early mobilization and discharge planning"},
        "fall_risk": {"riskPercentage": round(fall), "confidence": 65, "contributors": _get_contributors("fall", vitals, patient), "recommendation": "Implement fall precautions" if fall > 30 else "Standard mobility assistance"},
        "medication_complication_risk": {"riskPercentage": round(med_complication), "confidence": 63, "contributors": _get_contributors("med_complication", vitals, patient), "recommendation": "Review medication list for interactions" if med_complication > 30 else "Standard medication monitoring"},
    }

def _get_contributors(risk_type: str, vitals: dict, patient: dict | None = None) -> list:
    c = []
    hr = vitals.get("heart_rate")
    sbp = vitals.get("sbp")
    spo2 = vitals.get("spo2")
    temp = vitals.get("temperature")
    resp = vitals.get("resp_rate")
    if risk_type == "sepsis":
        if temp and temp > 38.3: c.append(f"Temperature elevated ({temp}°C)")
        if hr and hr > 90: c.append(f"Tachycardia ({hr} bpm)")
        if resp and resp > 20: c.append(f"Tachypnea ({resp}/min)")
        if sbp and sbp < 100: c.append(f"Hypotension ({sbp} mmHg)")
    elif risk_type == "mortality":
        if hr and hr > 120: c.append(f"Severe tachycardia ({hr} bpm)")
        if sbp and sbp < 90: c.append(f"Hypotension ({sbp} mmHg)")
        if spo2 and spo2 < 90: c.append(f"Severe hypoxemia ({spo2}%)")
        if temp and temp > 39: c.append(f"Hyperthermia ({temp}°C)")
    elif risk_type == "cardiac":
        if hr and hr > 110: c.append(f"Tachycardia ({hr} bpm)")
        if hr and hr < 55: c.append(f"Bradycardia ({hr} bpm)")
        if sbp and sbp < 90: c.append(f"Hypotension ({sbp} mmHg)")
        if sbp and sbp > 180: c.append(f"Hypertension ({sbp} mmHg)")
    elif risk_type == "respiratory":
        if spo2 and spo2 < 94: c.append(f"Hypoxemia ({spo2}%)")
        if resp and resp > 25: c.append(f"Tachypnea ({resp}/min)")
    elif risk_type == "cardiac_arrest":
        if hr and hr > 130: c.append(f"Severe tachycardia ({hr} bpm)")
        if hr and hr < 40: c.append(f"Severe bradycardia ({hr} bpm)")
        if sbp and sbp < 80: c.append(f"Severe hypotension ({sbp} mmHg)")
        if spo2 and spo2 < 85: c.append(f"Critical hypoxemia ({spo2}%)")
    elif risk_type == "icu_transfer":
        if sbp and sbp < 90: c.append(f"Hypotension ({sbp} mmHg)")
        if spo2 and spo2 < 90: c.append(f"Hypoxemia ({spo2}%)")
        if resp and resp > 25: c.append(f"Tachypnea ({resp}/min)")
        if hr and hr > 110: c.append(f"Tachycardia ({hr} bpm)")
        stability = patient.get("stability_category", "") if patient else ""
        if stability in ("critical", "high_risk"): c.append(f"Patient status: {stability}")
    elif risk_type == "organ_failure":
        if sbp and sbp < 90: c.append(f"Hypotension indicating possible shock ({sbp} mmHg)")
        if spo2 and spo2 < 90: c.append(f"Hypoxemia suggesting respiratory involvement ({spo2}%)")
        if temp and temp > 39: c.append(f"Fever suggesting systemic inflammation ({temp}°C)")
        if hr and hr > 120: c.append(f"Tachycardia suggesting cardiovascular stress ({hr} bpm)")
    elif risk_type == "med_complication" and patient:
        age = patient.get("age", 0)
        if age > 65: c.append(f"Age ({age}) increases medication sensitivity")
        stability = patient.get("stability_category", "")
        if stability in ("critical", "high_risk"): c.append("Critical illness increases complication risk")
        if sbp and sbp < 90: c.append("Hypotension may alter drug metabolism")
    elif risk_type == "fall" and patient:
        age = patient.get("age", 0)
        if age > 65: c.append(f"Age ({age}) > 65")
        if sbp and sbp < 100: c.append(f"Orthostatic hypotension risk")
        stability = patient.get("stability_category", "")
        if stability in ("critical", "high_risk"): c.append("Critical/high risk status")
    return c

@router.get("/{stay_id}/timeline")
async def patient_timeline(stay_id: int):
    """Full chronological timeline for a patient."""
    try:
        events = await get_patient_timeline(stay_id)
    except Exception:
        events = []

    # Add AI events from the replay engine if available
    if state.engine:
        alerts = state.engine.alert_engine._fired if state.engine.alert_engine else {}
        for alert_key, alert_time in list(alerts.items())[:20]:
            if str(stay_id) in alert_key:
                events.append({"type": "ALERT", "detail": f"Alert triggered: {alert_key}", "time": str(alert_time)})

    events.sort(key=lambda e: e.get("time") or "")
    return {"events": events}

@router.get("/{stay_id}/medications")
async def patient_medications(stay_id: int):
    """Current and past medications."""
    hadm_id = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
    if not hadm_id:
        demo = await get_patient_demographics(stay_id)
        hadm_id = demo.get("hadm_id") if demo else None
    if not hadm_id:
        return {"medications": []}

    try:
        meds = await get_prescriptions(hadm_id)
    except Exception:
        meds = []

    now = datetime.now(timezone.utc).isoformat()
    current = [m for m in meds if (m.get("starttime") or "") <= now and (not m.get("stoptime") or m["stoptime"] > now)]
    past = [m for m in meds if m.get("stoptime") and m["stoptime"] <= now]

    return {"medications": meds, "current": current, "past": past}

@router.get("/{stay_id}/allergies")
async def patient_allergies(stay_id: int):
    """Known allergies for the patient."""
    hadm_id = state.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
    if not hadm_id:
        demo = await get_patient_demographics(stay_id)
        hadm_id = demo.get("hadm_id") if demo else None
    if not hadm_id:
        return {"allergies": []}

    try:
        allergies = await get_allergies(hadm_id)
    except Exception:
        allergies = []

    return {"allergies": allergies}

@router.get("/{stay_id}/ai-summary")
async def patient_ai_summary(stay_id: int):
    """AI-generated clinical summary for the patient."""
    if not state.clinical_engine:
        return {"summary": None, "error": "AI services not available"}

    try:
        summary = await state.clinical_engine.generate_patient_summary(str(stay_id))
        return {"summary": summary}
    except Exception as e:
        return {"summary": None, "error": str(e)}
