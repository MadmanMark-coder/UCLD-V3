import math
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from backend import state
from backend.services.bed_manager import get_bed_stats
from backend.services.equipment_tracker import get_all_equipment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_history_kpi: list[dict] = []


@router.get("/kpi")
async def kpi():
    global _history_kpi
    patients = []
    total_alerts = 0
    if state.engine:
        patients = state.engine.get_current_patients()
        if state.engine.alert_engine:
            total_alerts = len([
                k for k, v in state.engine.alert_engine._fired.items()
                if v and (datetime.now(timezone.utc).timestamp() - v) < 300
            ])

    avg_stability = 0.0
    if patients:
        scores = [p.get("stability_score", 80) for p in patients]
        avg_stability = sum(scores) / len(scores)

    bed_stats = await get_bed_stats()
    total_beds = bed_stats.get("total", 1)
    occupied_beds = bed_stats.get("occupied", 0)
    bed_occupancy = round((occupied_beds / total_beds) * 100, 1)

    equip_list = await get_all_equipment()
    total_equip = len(equip_list) or 1
    in_use_equip = sum(1 for e in equip_list if e.get("status") == "in_use")
    equip_utilization = round((in_use_equip / total_equip) * 100, 1)

    now_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "avg_stability": round(avg_stability, 1),
        "active_alerts": total_alerts,
        "bed_occupancy": bed_occupancy,
        "equip_utilization": equip_utilization,
    }
    _history_kpi.append(now_entry)
    if len(_history_kpi) > 96:
        _history_kpi = _history_kpi[-96:]

    def _trend(key: str) -> str:
        if len(_history_kpi) < 3:
            return "stable"
        prev = _history_kpi[-3][key]
        curr = _history_kpi[-1][key]
        diff = curr - prev
        if diff > 2:
            return "up"
        if diff < -2:
            return "down"
        return "stable"

    return {
        "avg_stability": {"value": round(avg_stability, 1), "trend": _trend("avg_stability")},
        "active_alerts": {"value": total_alerts, "trend": _trend("active_alerts")},
        "bed_occupancy": {"value": bed_occupancy, "trend": _trend("bed_occupancy")},
        "equip_utilization": {"value": equip_utilization, "trend": _trend("equip_utilization")},
    }


@router.get("/trends")
async def trends(hours: int = Query(24, ge=1, le=168)):
    if len(_history_kpi) < 2:
        return {"timestamps": [], "avg_stability": [], "alert_count": [], "occupancy": [], "utilization": []}

    step = max(1, len(_history_kpi) // (hours * 4))
    sampled = _history_kpi[::step] if step > 1 else _history_kpi

    return {
        "timestamps": [e["timestamp"] for e in sampled],
        "avg_stability": [e["avg_stability"] for e in sampled],
        "alert_count": [e["active_alerts"] for e in sampled],
        "occupancy": [e["bed_occupancy"] for e in sampled],
        "utilization": [e["equip_utilization"] for e in sampled],
    }


@router.get("/forecasts")
async def hospital_forecasts():
    """Generate predictive forecasts for hospital capacity, admissions, and risk trends."""
    cohort = state.engine.get_current_patients() if state.engine else []
    current_time = datetime.now(timezone.utc).isoformat()

    critical_pct = round(sum(1 for p in cohort if p["stability_category"] == "critical") / max(len(cohort), 1) * 100, 1)
    high_risk_pct = round(sum(1 for p in cohort if p["stability_category"] in ("high_risk", "elevated")) / max(len(cohort), 1) * 100, 1)

    # Trend extrapolation
    forecasts = {}
    for hrs, label in [(1, "1h"), (3, "3h"), (6, "6h"), (12, "12h")]:
        critical_delta = critical_pct * 0.02 * hrs
        admission_forecast = max(cohort, key=lambda p: p.get("stability_score", 0) or 0).get("stability_score", 50) if cohort else 50
        forecasts[label] = {
            "critical_pct": round(min(100, critical_pct + critical_delta), 1),
            "deterioration_risk": round(min(95, high_risk_pct * 0.1 * hrs + 5), 1),
            "admission_forecast": round(min(100, admission_forecast - 2 * hrs), 1),
        }

    return {
        "generated_at": current_time,
        "patient_count": len(cohort),
        "forecasts": forecasts,
        "risk_summary": {
            "critical_pct": critical_pct,
            "high_risk_pct": high_risk_pct,
            "stable_pct": round(100 - critical_pct - high_risk_pct, 1),
        },
    }


@router.get("/patient-risks")
async def all_patient_risks():
    """Aggregate risk scores across all patients with all 10 prediction types + forecasts."""
    cohort = state.engine.get_current_patients() if state.engine else []

    from backend.api.patients import _get_risk_analysis

    patient_risks = []
    risk_type_totals: dict[str, list[int]] = {}
    risk_type_names = [
        "mortality_risk", "sepsis_risk", "cardiac_arrest_risk",
        "cardiac_event_risk", "respiratory_failure_risk", "icu_transfer_risk",
        "readmission_risk", "organ_failure_risk", "length_of_stay_risk",
        "fall_risk", "medication_complication_risk"
    ]

    for p in cohort:
        try:
            risk = await _get_risk_analysis(p["stay_id"], p)
        except Exception:
            risk = {}
        patient_risks.append({
            "stay_id": p["stay_id"],
            "subject_id": p["subject_id"],
            "age": p.get("age"),
            "gender": p.get("gender"),
            "admission_diagnosis": p.get("admission_diagnosis", ""),
            "first_careunit": p.get("first_careunit", ""),
            "stability_score": p.get("stability_score", 50),
            "stability_category": p.get("stability_category", "stable"),
            "risks": risk,
        })
        for rn in risk_type_names:
            if rn not in risk_type_totals:
                risk_type_totals[rn] = []
            rs = risk.get(rn, {})
            if isinstance(rs, dict):
                risk_type_totals[rn].append(rs.get("riskPercentage", 0))

    # Compute averages for each risk type
    risk_averages = {}
    for rn, vals in risk_type_totals.items():
        risk_averages[rn] = round(sum(vals) / len(vals), 1) if vals else 0

    # Count patients in each risk band per type
    high_risk_patients = {}
    for rn in risk_type_names:
        high_risk_patients[rn] = sum(1 for pr in patient_risks if pr["risks"].get(rn, {}).get("riskPercentage", 0) >= 50)

    # Generate genuine predictive forecasts using the rule-based deterioration model
    forecasts = {}
    forecast_meta = {}

    def _predict_patient_deterioration(score: float, vitals: dict, hrs: int) -> dict:
        """Predict deterioration for a single patient at a given time horizon."""
        hr = vitals.get("heart_rate") or 80
        sbp = vitals.get("sbp") or 120
        spo2 = vitals.get("spo2") or 97
        temp = vitals.get("temperature") or 37.0

        # Base deterioration from stability score (lower score = higher risk)
        deterioration_base = max(0, 100 - score)

        # Vital sign abnormality penalty — each abnormal vital adds risk
        vital_penalty = 0
        if hr > 110: vital_penalty += 15
        if hr < 50: vital_penalty += 20
        if sbp < 90: vital_penalty += 20
        if sbp > 180: vital_penalty += 12
        if spo2 < 92: vital_penalty += 20
        if spo2 < 88: vital_penalty += 15
        if temp > 39: vital_penalty += 15
        if temp < 36: vital_penalty += 10

        # Time factor — sqrt for diminishing growth over longer windows
        time_factor = math.sqrt(hrs)
        deterioration = (deterioration_base * 0.15 + vital_penalty * 0.1) * time_factor
        deterioration = min(95, deterioration)

        # Confidence decreases with longer windows
        confidence = max(30, 88 - hrs * 5)

        return {
            "deterioration": round(deterioration, 1),
            "confidence": round(confidence),
            "has_abnormal_vitals": vital_penalty > 0,
        }

    def _forecast_risk_type(base_avg: float, patient_scores: list, patient_vitals_list: list, hrs: int) -> dict:
        """Forecast a single risk type by applying deterioration to each patient and aggregating."""
        predicted_values = []
        confidences = []
        avg_score = sum(patient_scores) / max(len(patient_scores), 1)
        for score, vitals in zip(patient_scores, patient_vitals_list):
            pred = _predict_patient_deterioration(score, vitals, hrs)
            # Deterioration scales with base risk — higher base risks grow faster
            risk_factor = 0.3 + (base_avg / 100) * 0.7
            predicted = base_avg + pred["deterioration"] * risk_factor
            predicted_values.append(min(100, predicted))
            confidences.append(pred["confidence"])

        avg_val = round(sum(predicted_values) / len(predicted_values), 1) if predicted_values else base_avg
        avg_conf = round(sum(confidences) / len(confidences)) if confidences else 50
        high_risk_count = sum(1 for v in predicted_values if v >= 50)

        # Determine trend
        diff = avg_val - base_avg
        trend = "declining" if diff >= 3 else ("improving" if diff <= -3 else "stable")

        return {
            "value": min(100, avg_val),
            "confidence": avg_conf,
            "trend": trend,
            "patients_high_risk": high_risk_count,
        }

    # Pre-compute per-patient scores and vitals
    patient_scores = [p["stability_score"] for p in cohort]
    patient_vitals_list = [p.get("latest_vitals", {}) or {} for p in cohort]

    for hrs, label in [(1, "1h"), (3, "3h"), (6, "6h"), (12, "12h")]:
        forecast_entry = {}
        for rn in risk_type_names:
            base_avg = risk_averages.get(rn, 10)
            forecast_entry[rn] = _forecast_risk_type(base_avg, patient_scores, patient_vitals_list, hrs)
        forecasts[label] = forecast_entry

    # Meta: aggregate deterioration distribution for each window
    forecast_meta = {}
    for hrs, label in [(1, "1h"), (3, "3h"), (6, "6h"), (12, "12h")]:
        distribution = {"critical": 0, "high": 0, "elevated": 0, "low": 0}
        for score, vitals in zip(patient_scores, patient_vitals_list):
            pred = _predict_patient_deterioration(score, vitals, hrs)
            d = pred["deterioration"]
            if d >= 70: distribution["critical"] += 1
            elif d >= 50: distribution["high"] += 1
            elif d >= 30: distribution["elevated"] += 1
            else: distribution["low"] += 1
        forecast_meta[label] = {
            "deterioration_distribution": distribution,
            "model": "rule_based",
        }

    return {
        "patient_count": len(cohort),
        "patient_risks": patient_risks,
        "risk_averages": risk_averages,
        "high_risk_counts": high_risk_patients,
        "forecasts": forecasts,
        "forecast_meta": forecast_meta,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/capacity")
async def capacity():
    bed_stats = await get_bed_stats()
    total_beds = bed_stats.get("total", 1)
    occupied_beds = bed_stats.get("occupied", 0)
    current_pct = round((occupied_beds / total_beds) * 100, 1)

    projected_1h = current_pct
    projected_2h = current_pct
    projected_4h = current_pct
    alert_msg = ""

    if len(_history_kpi) >= 3:
        recent = _history_kpi[-3:]
        occ_values = [e["bed_occupancy"] for e in recent]
        avg_change_per_entry = (occ_values[-1] - occ_values[0]) / max(len(recent) - 1, 1)
        entries_per_hour = max(len(_history_kpi) / 24, 1)
        change_per_hour = avg_change_per_entry * entries_per_hour

        def clamp(pct):
            return max(0, min(100, round(pct, 1)))

        projected_1h = clamp(current_pct + change_per_hour)
        projected_2h = clamp(current_pct + change_per_hour * 2)
        projected_4h = clamp(current_pct + change_per_hour * 4)

        if projected_2h > 90:
            alert_msg = f"If current trend continues, ICU will be at {projected_2h}% capacity in ~2 hours."
        elif projected_4h > 90:
            alert_msg = f"If current trend continues, ICU will be at {projected_4h}% capacity in ~4 hours."

    return {
        "current_occupancy": current_pct,
        "projected_1h": projected_1h,
        "projected_2h": projected_2h,
        "projected_4h": projected_4h,
        "alert": alert_msg,
    }


@router.get("/feed")
async def monitoring_feed(limit: int = Query(20, ge=1, le=100)):
    """Generate a live monitoring feed from real patient data and events."""
    events = []
    cohort = state.engine.get_current_patients() if state.engine else []

    # Patient-driven events
    for p in cohort:
        if p["stability_category"] == "critical":
            events.append({
                "type": "AI_WARNING",
                "message": f"Critical alert for Patient {p['subject_id']} — immediate intervention required",
                "patient_id": p["stay_id"],
                "severity": "critical",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        if p["stability_category"] == "high_risk":
            events.append({
                "type": "RISK_SCORE_UPDATED",
                "message": f"Risk score elevated for Patient {p['subject_id']} — monitoring increased",
                "patient_id": p["stay_id"],
                "severity": "warning",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # Heart rate spike events
    for p in cohort:
        hr = p.get("latest_vitals", {}).get("heart_rate")
        if hr is not None and hr > 110:
            events.append({
                "type": "HEART_RATE_SPIKE",
                "message": f"Heart rate spike detected: {hr} bpm for Patient {p['subject_id']}",
                "patient_id": p["stay_id"],
                "severity": "elevated",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # O2 desaturation events
    for p in cohort:
        spo2 = p.get("latest_vitals", {}).get("spo2")
        if spo2 is not None and spo2 < 92:
            events.append({
                "type": "O2_DROP",
                "message": f"Oxygen saturation drop: {spo2}% for Patient {p['subject_id']}",
                "patient_id": p["stay_id"],
                "severity": "critical",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # Department-based events
    dept_patients = {}
    for p in cohort:
        dept = p.get("first_careunit", "Unknown")
        if dept not in dept_patients:
            dept_patients[dept] = {"total": 0, "critical": 0}
        dept_patients[dept]["total"] += 1
        if p["stability_category"] == "critical":
            dept_patients[dept]["critical"] += 1

    for dept, info in dept_patients.items():
        if info["critical"] > 2:
            dept_short = dept.split("(")[0].strip()
            events.append({
                "type": "PATIENT_TRANSFERRED",
                "message": f"Multiple critical patients in {dept_short} — activating surge protocol",
                "patient_id": 0,
                "severity": "warning",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # Recent admission events from DB
    try:
        from backend.database.connection import get_mimic_db
        async with get_mimic_db() as db:
            recent = await db.execute_fetchall(
                """SELECT subject_id, admittime, admission_type
                   FROM "hosp.admissions"
                   ORDER BY admittime DESC LIMIT 5"""
            )
            for r in recent:
                events.append({
                    "type": "NEW_ADMISSION",
                    "message": f"New admission: Patient {r['subject_id']} ({r['admission_type']})",
                    "patient_id": r["subject_id"],
                    "severity": "info",
                    "timestamp": r["admittime"] if r["admittime"] else datetime.now(timezone.utc).isoformat(),
                })
    except Exception:
        pass

    # Sort by timestamp desc, limit
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:limit]


@router.get("/stats")
async def hospital_stats():
    """Real hospital statistics computed from MIMIC-IV Demo database."""
    from backend.database.connection import get_mimic_db
    from collections import Counter

    async with get_mimic_db() as db:
        total_patients = (await db.execute_fetchall('SELECT COUNT(*) AS c FROM "hosp.patients"'))[0]["c"]
        total_admissions = (await db.execute_fetchall('SELECT COUNT(*) AS c FROM "hosp.admissions"'))[0]["c"]
        total_icustays = (await db.execute_fetchall('SELECT COUNT(*) AS c FROM "icu.icustays"'))[0]["c"]
        total_chartevents = (await db.execute_fetchall('SELECT COUNT(*) AS c FROM "icu.chartevents"'))[0]["c"]

        # Gender distribution
        gender_rows = await db.execute_fetchall('SELECT gender, COUNT(*) AS c FROM "hosp.patients" GROUP BY gender')
        gender_dist = {r["gender"]: r["c"] for r in gender_rows}

        # Age stats
        age_rows = await db.execute_fetchall('SELECT CAST(anchor_age AS INTEGER) AS age FROM "hosp.patients" WHERE anchor_age IS NOT NULL')
        ages = [r["age"] for r in age_rows]
        avg_age = round(sum(ages) / len(ages), 1) if ages else 0

        # Admissions by type
        adm_type_rows = await db.execute_fetchall('SELECT admission_type, COUNT(*) AS c FROM "hosp.admissions" GROUP BY admission_type')
        admissions_by_type = {r["admission_type"]: r["c"] for r in adm_type_rows}

        # ICU stays by department
        dept_rows = await db.execute_fetchall('SELECT first_careunit, COUNT(*) AS c FROM "icu.icustays" GROUP BY first_careunit ORDER BY c DESC')
        icu_by_dept = {r["first_careunit"]: r["c"] for r in dept_rows}

        # Mortality stats
        died = (await db.execute_fetchall('SELECT COUNT(*) AS c FROM "hosp.patients" WHERE dod IS NOT NULL'))[0]["c"]

        # Length of stay (from icustays intime/outtime)
        los_rows = await db.execute_fetchall(
            """SELECT ROUND(AVG(julianday(outtime) - julianday(intime)), 2) AS avg_los_days
               FROM "icu.icustays" WHERE outtime IS NOT NULL AND intime IS NOT NULL"""
        )
        avg_los = round(los_rows[0]["avg_los_days"], 2) if los_rows and los_rows[0]["avg_los_days"] else 0

        # Top diagnoses
        diag_rows = await db.execute_fetchall(
            """SELECT d.long_title, COUNT(*) AS c
               FROM "hosp.diagnoses_icd" di
               JOIN "hosp.d_icd_diagnoses" d ON di.icd_code = d.icd_code
               GROUP BY di.icd_code ORDER BY c DESC LIMIT 10"""
        )
        top_diagnoses = [{"title": r["long_title"], "count": r["c"]} for r in diag_rows]

        # Vitals averages
        from backend.mimic.item_codes import VITAL_ITEM_IDS
        vital_averages = {}
        for vname, vid in VITAL_ITEM_IDS.items():
            row = await db.execute_fetchall(
                'SELECT ROUND(AVG(CAST(valuenum AS REAL)), 1) AS avg_val FROM "icu.chartevents" WHERE itemid = ? AND valuenum IS NOT NULL',
                (str(vid),)
            )
            if row and row[0]["avg_val"]:
                vital_averages[vname] = row[0]["avg_val"]

        # Readmission rate (patients with >1 admission)
        readmit = await db.execute_fetchall(
            """SELECT COUNT(*) AS cnt FROM (
                   SELECT subject_id, COUNT(*) AS num_admissions
                   FROM "hosp.admissions" GROUP BY subject_id HAVING num_admissions > 1
               )"""
        )
        readmission_rate = round(readmit[0]["cnt"] / total_patients * 100, 1) if total_patients > 0 else 0

    # Compute from current cohort
    cohort = state.engine.get_current_patients() if state.engine else []
    critical_count = sum(1 for p in cohort if p["stability_category"] == "critical")
    high_risk_count = sum(1 for p in cohort if p["stability_category"] == "high_risk")
    elevated_count = sum(1 for p in cohort if p["stability_category"] == "elevated")
    observation_count = sum(1 for p in cohort if p["stability_category"] == "observation")
    stable_count = sum(1 for p in cohort if p["stability_category"] == "stable")

    return {
        "total_patients": total_patients,
        "total_admissions": total_admissions,
        "total_icustays": total_icustays,
        "total_chartevents": total_chartevents,
        "gender_distribution": gender_dist,
        "average_age": avg_age,
        "admissions_by_type": admissions_by_type,
        "icu_by_department": icu_by_dept,
        "deceased": died,
        "average_los_days": avg_los,
        "top_diagnoses": top_diagnoses,
        "vital_averages": vital_averages,
        "readmission_rate_pct": readmission_rate,
        "current_cohort": {
            "total": len(cohort),
            "critical": critical_count,
            "high_risk": high_risk_count,
            "elevated": elevated_count,
            "observation": observation_count,
            "stable": stable_count,
        },
    }
