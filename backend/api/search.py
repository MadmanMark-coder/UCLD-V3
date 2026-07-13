import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import state
from backend.database.connection import get_mimic_db
from backend.mimic.item_codes import VITAL_ITEM_IDS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])

CLINICAL_SYSTEM_PROMPT = """You are a friendly, conversational AI assistant for a hospital. Be warm and natural like ChatGPT. If the user greets you, greet back warmly. For clinical questions, use the database context and be specific. Keep responses concise (1-3 sentences)."""

INTENT_KEYWORDS = {
    "patient": ["patient", "who is", "show me", "details for"],
    "risk": ["risk", "critical", "high risk", "deteriorat", "urgent", "severe", "destabilize"],
    "vitals": ["heart rate", "vital", "vitals", "blood pressure", "bp", "spo2", "temperature", "respir"],
    "diagnosis": ["diabet", "sepsis", "diagnosis", "condition", "disease", "infection", "cardiac", "pneumonia", "respiratory failure", "renal", "kidney", "liver", "cancer"],
    "lab": ["lab", "lab result", "blood", "wbc", "lactate", "creatinine", "hemoglobin", "platelet", "sodium", "potassium", "glucose"],
    "admission": ["admission", "admit", "admitted", "transfer", "intake", "census"],
    "medication": ["medication", "drug", "prescription", "medicine", "antibiotic", "dose"],
    "icu": ["icu", "department", "care unit", "micu", "sicu", "ccu", "unit"],
    "statistics": ["statistics", "stats", "count", "how many", "total", "average", "summary", "overview"],
    "timeline": ["timeline", "history", "events", "occurred", "when did", "sequence"],
    "equipment": ["equipment", "ventilator", "machine", "device", "bed", "monitor"],
    "forecast": ["forecast", "predict", "future", "trend", "projected", "will", "expected"],
}

async def get_search_context(query: str) -> str:
    """Gather comprehensive database context based on query intent analysis."""
    context_parts = []
    q = query.lower()

    # Detect intents
    intents = [intent for intent, keywords in INTENT_KEYWORDS.items()
               if any(kw in q for kw in keywords)]

    async with get_mimic_db() as db:
        # Always include basic counts
        row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.patients"')
        total_patients = row[0]["cnt"]
        row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.admissions"')
        total_admissions = row[0]["cnt"]
        row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "icu.icustays"')
        total_icustays = row[0]["cnt"]

        context_parts.append(f"Hospital Overview: {total_patients} patients, {total_admissions} admissions, {total_icustays} ICU stays in MIMIC-IV Demo database.")

        # Patient-specific queries
        if any(intent in intents for intent in ["patient", "risk", "vitals", "diagnosis"]):
            cohort = state.engine.get_current_patients() if state.engine else []
            if cohort:
                critical = [p for p in cohort if p["stability_category"] == "critical"]
                high_risk = [p for p in cohort if p["stability_category"] == "high_risk"]
                context_parts.append(f"\nCurrent cohort: {len(cohort)} patients. Critical: {len(critical)}, High Risk: {len(high_risk)}, Stable: {len(cohort) - len(critical) - len(high_risk)}")
                if critical:
                    context_parts.append(f"Critical patients (stay_id): {[p['stay_id'] for p in critical[:5]]}")
                if high_risk:
                    context_parts.append(f"High risk patients (stay_id): {[p['stay_id'] for p in high_risk[:5]]}")

        # Diagnosis queries
        if "diagnosis" in intents:
            rows = await db.execute_fetchall(
                """SELECT d.long_title, COUNT(*) AS cnt
                   FROM "hosp.diagnoses_icd" di
                   JOIN "hosp.d_icd_diagnoses" d ON di.icd_code = d.icd_code
                   GROUP BY di.icd_code ORDER BY cnt DESC LIMIT 15"""
            )
            if rows:
                context_parts.append("\nTop diagnoses (count): " + ", ".join(f"'{r['long_title'][:60]}' ({r['cnt']})" for r in rows[:10]))

        # Vital queries
        if "vitals" in intents:
            for vname, vid in VITAL_ITEM_IDS.items():
                row = await db.execute_fetchall(
                    f"""SELECT ROUND(AVG(CAST(valuenum AS REAL)), 1) AS avg_val,
                               MIN(CAST(valuenum AS REAL)) AS min_val,
                               MAX(CAST(valuenum AS REAL)) AS max_val
                        FROM "icu.chartevents" WHERE itemid = ? AND valuenum IS NOT NULL""",
                    (str(vid),)
                )
                if row and row[0]['avg_val']:
                    context_parts.append(f"\n{vname}: avg={row[0]['avg_val']}, range=[{row[0]['min_val']}-{row[0]['max_val']}]")

        # Lab queries
        if "lab" in intents:
            rows = await db.execute_fetchall(
                """SELECT l.itemid, d.label, ROUND(AVG(CAST(l.valuenum AS REAL)), 1) AS avg_val,
                          ROUND(MIN(CAST(l.valuenum AS REAL)), 1) AS min_val,
                          ROUND(MAX(CAST(l.valuenum AS REAL)), 1) AS max_val
                   FROM "hosp.labevents" l
                   LEFT JOIN "hosp.d_labitems" d ON l.itemid = d.itemid
                   WHERE l.valuenum IS NOT NULL
                   GROUP BY l.itemid ORDER BY COUNT(*) DESC LIMIT 20"""
            )
            if rows:
                context_parts.append("\nKey lab averages (label: avg [min-max]):")
                context_parts.extend(f"  {r['label'] or f'Item {r['itemid']}'}: {r['avg_val']} [{r['min_val']}-{r['max_val']}]" for r in rows[:10])

        # Admission queries
        if "admission" in intents:
            rows = await db.execute_fetchall(
                """SELECT admission_type, COUNT(*) AS cnt
                   FROM "hosp.admissions" GROUP BY admission_type ORDER BY cnt DESC"""
            )
            if rows:
                context_parts.append("\nAdmissions by type: " + str({r['admission_type']: r['cnt'] for r in rows}))
            rows = await db.execute_fetchall(
                """SELECT DATE(admittime) as dt, COUNT(*) AS cnt
                   FROM "hosp.admissions" GROUP BY dt ORDER BY dt DESC LIMIT 7"""
            )
            if rows:
                context_parts.append("\nRecent admissions (last 7 days): " + ", ".join(f"{r['dt']}: {r['cnt']}" for r in rows))

        # Medication queries
        if "medication" in intents:
            rows = await db.execute_fetchall(
                """SELECT drug, COUNT(*) AS cnt, COUNT(DISTINCT hadm_id) AS patients
                   FROM "hosp.prescriptions" GROUP BY drug ORDER BY cnt DESC LIMIT 15"""
            )
            if rows:
                context_parts.append("\nMost prescribed medications: " + ", ".join(f"{r['drug']} ({r['cnt']} rx, {r['patients']} patients)" for r in rows[:10]))

        # ICU/Department queries
        if "icu" in intents:
            rows = await db.execute_fetchall(
                """SELECT first_careunit, COUNT(*) AS cnt, COUNT(DISTINCT subject_id) AS patients
                   FROM "icu.icustays" GROUP BY first_careunit ORDER BY cnt DESC"""
            )
            if rows:
                context_parts.append("\nICU by department: " + ", ".join(f"{r['first_careunit']}: {r['cnt']} stays, {r['patients']} patients" for r in rows))

        # Statistics queries
        if "statistics" in intents:
            context_parts.append(f"\nDatabase statistics: {total_patients} patients, {total_admissions} admissions, {total_icustays} ICU stays")
            row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.diagnoses_icd"')
            context_parts.append(f"Diagnosis records: {row[0]['cnt']}")
            row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "icu.chartevents"')
            context_parts.append(f"Chart events (vitals): {row[0]['cnt']}")
            row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.labevents"')
            context_parts.append(f"Lab events: {row[0]['cnt']}")
            row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.prescriptions"')
            context_parts.append(f"Prescriptions: {row[0]['cnt']}")
            row = await db.execute_fetchall('SELECT COUNT(*) AS cnt FROM "hosp.transfers"')
            context_parts.append(f"Transfer records: {row[0]['cnt']}")

        # Timeline queries
        if "timeline" in intents:
            context_parts.append("\nThe timeline endpoint at /api/patients/{stay_id}/timeline provides comprehensive patient chronology including transfers, medications, labs, vitals, and alerts.")

        # Equipment queries
        if "equipment" in intents:
            from backend.services.equipment_tracker import get_all_equipment, get_equipment_stats
            try:
                eq_stats = await get_equipment_stats()
                if eq_stats:
                    context_parts.append(f"\nEquipment: {eq_stats['total']} total ({eq_stats['available']} available, {eq_stats['in_use']} in use, {eq_stats['maintenance']} maintenance)")
            except Exception:
                pass

        # Forecast queries
        if "forecast" in intents:
            context_parts.append("\nForecast capabilities: 1h/3h/6h/12h risk windows available at /api/analytics/forecasts. For patient-specific forecasts, use /api/patients/{stay_id}/risk endpoint.")

    return "\n".join(context_parts) if context_parts else "No relevant data found for this query."


class SearchQuery(BaseModel):
    query: str

@router.post("/query")
async def search_query(body: SearchQuery):
    if not state.groq_client:
        raise HTTPException(status_code=503, detail="AI service not configured")

    context = await get_search_context(body.query)
    result = await state.groq_client.chat_completion(
        "operations",
        [{"role": "system", "content": CLINICAL_SYSTEM_PROMPT},
         {"role": "user", "content": f"Database context:\n{context}\n\nQuestion: {body.query}\n\nProvide a clear, data-driven answer with specific numbers and patient IDs when relevant."}]
    )
    if result:
        answer = result.get("content", "No response")
    else:
        try:
            answer = await state.operations_copilot.answer_query(body.query)
        except Exception:
            answer = f"Based on the available data: {context.replace(chr(10), '; ')[:300]}"
    return {"query": body.query, "answer": answer, "context_used": context, "intents_detected": [i for i, kws in INTENT_KEYWORDS.items() if any(kw in body.query.lower() for kw in kws)]}

@router.post("/analytics")
async def search_analytics(body: SearchQuery):
    if not state.groq_client:
        raise HTTPException(status_code=503, detail="AI service not configured")

    context = await get_search_context(body.query)
    result = await state.groq_client.chat_completion(
        "operations",
        [{"role": "system", "content": "You are a hospital analytics AI. Answer using the real database data provided. Include specific numbers and trends."},
         {"role": "user", "content": f"Data:\n{context}\n\nQuestion: {body.query}\n\nProvide a clear, data-driven answer with specific metrics and actionable insights."}]
    )
    if result:
        answer = result.get("content", "No response")
    else:
        answer = f"Analytics data retrieved, but AI summarization unavailable. Raw context:\n{context}"
    return {"query": body.query, "answer": answer}
