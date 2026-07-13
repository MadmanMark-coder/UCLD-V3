import asyncio
import json
import logging
import math
from datetime import timedelta

from backend.database.connection import get_mimic_db
from backend.database.mimic_queries import get_diagnoses, get_prescriptions, get_labs, VITAL_ITEM_IDS

logger = logging.getLogger(__name__)

SUMMARY_CACHE_TTL = 300
DET_CACHE_TTL = 120

class ClinicalEngine:
    def __init__(self, groq_client, engine):
        self.groq = groq_client
        self.engine = engine
        self._cache: dict[str, tuple[float, dict]] = {}
        self._det_cache: dict[str, tuple[float, dict]] = {}

    @staticmethod
    def _extract_json(text: str) -> str | None:
        if not text:
            return None
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            in_block = False
            parts = []
            for line in lines:
                if line.strip().startswith("```"):
                    in_block = not in_block
                    continue
                if in_block:
                    parts.append(line)
            if parts:
                stripped = "\n".join(parts).strip()
        brace_start = stripped.find("{")
        if brace_start == -1:
            return None
        depth = 0
        for i in range(brace_start, len(stripped)):
            ch = stripped[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = stripped[brace_start:i+1]
                    try:
                        json.loads(candidate)
                        return candidate
                    except (json.JSONDecodeError, TypeError):
                        pass
        return None

    async def generate_patient_summary(self, patient_id: str) -> dict:
        now = self.engine.clock.get_current_time().timestamp()
        cached = self._cache.get(patient_id)
        if cached and (now - cached[0]) < SUMMARY_CACHE_TTL:
            return cached[1]

        stay_id = int(patient_id)
        patients = self.engine.get_current_patients()
        patient = next((p for p in patients if str(p["stay_id"]) == patient_id), None)
        if not patient:
            return self._fallback_summary(patient_id, "Patient not found")

        hadm_id = self.engine.cohort_patients.get(stay_id, {}).get("hadm_id")
        diagnoses = []
        prescriptions = []
        labs = []
        if hadm_id:
            try:
                diagnoses = await get_diagnoses(hadm_id) or []
            except Exception:
                pass
            try:
                prescriptions = await get_prescriptions(hadm_id) or []
            except Exception:
                pass
            try:
                labs = await get_labs(hadm_id, 24) or []
            except Exception:
                pass

        vitals = patient.get("latest_vitals") or {}
        history = self.engine.get_patient_vitals_history(stay_id, hours=2)

        prompt = self._build_summary_prompt(patient, vitals, diagnoses, prescriptions, labs, history)
        try:
            result = await asyncio.wait_for(
                self.groq.clinical_complete([{"role": "user", "content": prompt}]),
                timeout=25.0
            )
        except asyncio.TimeoutError:
            logger.warning("Groq clinical call timed out after 25s for patient %s", patient_id)
            return self._fallback_summary(patient_id, "AI timed out", patient, vitals)
        except Exception as e:
            logger.error("Groq clinical call failed for patient %s: %s", patient_id, e)
            return self._fallback_summary(patient_id, f"AI error: {e}", patient, vitals)
        if not result or not result.get("content"):
            logger.warning("Groq returned empty result for patient %s", patient_id)
            return self._fallback_summary(patient_id, "AI unavailable", patient, vitals)

        raw = result["content"]
        try:
            summary = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            extracted = self._extract_json(raw)
            if extracted:
                try:
                    summary = json.loads(extracted)
                except (json.JSONDecodeError, TypeError):
                    return self._fallback_summary(patient_id, "Parse error", patient, vitals)
            else:
                return self._fallback_summary(patient_id, "Parse error", patient, vitals)

        summary.setdefault("one_liner", f"Patient {patient_id} — {patient.get('stability_category', 'stable')}")
        summary.setdefault("status", patient.get("stability_category", "stable").replace("_", " ").title())
        summary.setdefault("stability_trend", "Stable")
        summary.setdefault("key_changes", [])
        summary.setdefault("risks", [])
        summary.setdefault("summary", "No summary available.")
        summary.setdefault("recommendations", [])

        self._cache[patient_id] = (now, summary)
        return summary

    def _build_summary_prompt(self, patient: dict, vitals: dict, diagnoses: list, prescriptions: list, labs: list, history: list) -> str:
        dx_lines = "\n".join(f"- {d.get('long_title', d.get('icd_code', 'Unknown'))}" for d in diagnoses[:5]) or "None recorded"
        rx_lines = "\n".join(f"- {p.get('drug', 'Unknown')} {p.get('dose_val_rx', '')} {p.get('dose_unit_rx', '')} {p.get('route', '')}" for p in prescriptions[:5]) or "None recorded"
        lab_lines = "\n".join(f"- itemid {l.get('itemid')}: {l.get('valuenum')}" for l in labs[:5]) or "None recorded"
        vitals_str = "; ".join(f"{k}={v}" for k, v in vitals.items() if v is not None) or "No recent vitals"

        return f"""You are a clinical decision support AI. Return a JSON object with these exact keys:
- one_liner (string): brief clinical summary
- status (string): Critical or High Risk or Elevated or Observation or Stable
- stability_trend (string): Improving or Stable or Declining
- key_changes (array of strings)
- risks (array of objects with keys condition, severity, description, recommendation)
- summary (string): paragraph-length clinical summary
- recommendations (array of strings)

Example: {{"one_liner": "Patient diagnosis summary here", "status": "Critical", "stability_trend": "Declining", "key_changes": [], "risks": [], "summary": "Detailed summary here.", "recommendations": ["Action 1", "Action 2"]}}

Patient: Stay {patient.get('stay_id')}, {patient.get('gender', '?')}, {patient.get('age', '?')}y | Diagnosis: {patient.get('admission_diagnosis', 'N/A')} | Unit: {patient.get('first_careunit', 'N/A')}
Stability: {patient.get('stability_score', 'N/A')}/100 ({patient.get('stability_category', 'N/A')})
Vitals: {vitals_str}
Diagnoses:\n{dx_lines}
Medications:\n{rx_lines}
Recent Labs:\n{lab_lines}

Return ONLY a valid JSON object. No markdown. No backticks. No extra text."""

    def _fallback_summary(self, patient_id: str, reason: str, patient: dict | None = None, vitals: dict | None = None) -> dict:
        category = (patient or {}).get("stability_category", "stable") if patient else "stable"
        score = (patient or {}).get("stability_score", 50) if patient else 50
        hr = (vitals or {}).get("heart_rate")
        sbp = (vitals or {}).get("sbp")
        spo2 = (vitals or {}).get("spo2")
        rr = (vitals or {}).get("resp_rate")
        temp = (vitals or {}).get("temperature")
        age = (patient or {}).get("age", "?")
        gender = (patient or {}).get("gender", "?")
        diag = (patient or {}).get("admission_diagnosis", "Unknown")

        vitals_summary = f"HR {hr if hr else '?'}, BP {sbp if sbp else '?'}, SpO2 {spo2 if spo2 else '?'}, RR {rr if rr else '?'}, Temp {temp if temp else '?'}"

        risks = [{"condition": "General deterioration", "severity": "critical" if score < 30 else "high" if score < 60 else "medium",
                   "description": f"Stability score is {score}/100 ({category})", "recommendation": "Continue monitoring"}]
        if hr and hr > 110:
            risks.append({"condition": "Tachycardia", "severity": "high", "description": f"Heart rate {hr} bpm", "recommendation": "Assess volume status and consider rate control"})
        if sbp and sbp < 90:
            risks.append({"condition": "Hypotension", "severity": "high", "description": f"Blood pressure {sbp} mmHg", "recommendation": "Assess perfusion and consider vasopressors"})
        if spo2 and spo2 < 92:
            risks.append({"condition": "Hypoxemia", "severity": "high", "description": f"Oxygen saturation {spo2}%", "recommendation": "Supplemental oxygen, consider ABG"})

        return {
            "one_liner": f"Patient {patient_id} ({gender}, {age}y) — {diag} — {category.replace('_', ' ').title()} (score: {score})",
            "status": category.replace("_", " ").title(),
            "stability_trend": "Stable",
            "key_changes": [f"Vitals: {vitals_summary}"],
            "risks": risks,
            "summary": f"{reason}. {gender} patient, {age} years. Diagnosis: {diag}. Stability: {score}/100 ({category}). Vitals: {vitals_summary}. Risk-based clinical summary: patient presents with {diag.lower() if diag != 'Unknown' else 'unknown condition'}, currently {category.replace('_', ' ')}. Key vital signs show {vitals_summary}. Continue standard monitoring and reassess as needed.",
            "recommendations": [
                "Monitor vitals every 1-2 hours",
                "Review recent lab results",
                "Assess fluid status and urine output",
                "Update care plan based on stability trend",
            ],
        }

    async def analyze_risks(self, patient_id: str) -> dict:
        """Full risk analysis with mortality, sepsis, cardiac, respiratory, readmission, fall, ICU transfer, organ failure, LOS, medication complications."""
        stay_id = int(patient_id)
        patients = self.engine.get_current_patients()
        patient = next((p for p in patients if str(p["stay_id"]) == patient_id), None)
        if not patient:
            return {"error": "Patient not found"}

        vitals = patient.get("latest_vitals") or {}
        history = self.engine.get_patient_vitals_history(stay_id, hours=12)
        hadm_id = self.engine.cohort_patients.get(stay_id, {}).get("hadm_id")

        diagnoses = []
        if hadm_id:
            try:
                diagnoses = await get_diagnoses(hadm_id) or []
            except Exception:
                pass

        prompt = self._build_risk_prompt(patient, vitals, history, diagnoses)
        result = await self.groq.clinical_complete([{"role": "user", "content": prompt}])
        if not result or not result.get("content"):
            return self._fallback_risks(patient, vitals)

        try:
            return json.loads(result["content"])
        except (json.JSONDecodeError, TypeError):
            extracted = self._extract_json(result["content"])
            if extracted:
                try:
                    return json.loads(extracted)
                except (json.JSONDecodeError, TypeError):
                    pass
            return self._fallback_risks(patient, vitals)

    def _build_risk_prompt(self, patient: dict, vitals: dict, history: list, diagnoses: list) -> str:
        dx = "; ".join(d.get("long_title", d.get("icd_code", "")) for d in diagnoses[:5]) or "None"
        vitals_str = json.dumps({k: v for k, v in vitals.items() if v is not None}, default=str)

        return f"""Analyze the following ICU patient and return a JSON object with ALL of these risk assessments.
Each risk must have: "riskPercentage" (0-100), "confidence" (0-100), "contributors" (list of strings), "recommendation" (string).

Required risk keys: "mortality_risk", "sepsis_risk", "cardiac_arrest_risk", "respiratory_failure_risk", "icu_transfer_risk", "readmission_risk", "organ_failure_risk", "length_of_stay_risk", "fall_risk", "medication_complication_risk"

Also include a "forecasts" object with keys "1h", "3h", "6h", "12h". Each forecast has:
- "deterioration_score" (0-100): predicted deterioration level
- "confidence" (0-100): confidence in this prediction
- "explanation": reason for this forecast
- "suggested_interventions": list of recommended actions
- "risk_trend": "improving", "stable", or "declining"

Patient: Stay {patient.get("stay_id")}
Demographics: {patient.get("gender", "?")}, {patient.get("age", "?")}y
Diagnosis: {patient.get("admission_diagnosis", "N/A")}
Unit: {patient.get("first_careunit", "N/A")}
Stability Score: {patient.get("stability_score", "N/A")}/100
Category: {patient.get("stability_category", "N/A")}
Diagnoses: {dx}
Current Vitals: {vitals_str}
History data points (last 12h): {len(history)}

Return ONLY valid JSON."""

    async def forecast_risk(self, patient_id: str, hours: int = 3) -> dict:
        """Generate risk forecast for a specific time window."""
        stay_id = int(patient_id)
        patients = self.engine.get_current_patients()
        patient = next((p for p in patients if str(p["stay_id"]) == patient_id), None)
        if not patient:
            return {"error": "Patient not found"}

        vitals = patient.get("latest_vitals") or {}
        history = self.engine.get_patient_vitals_history(stay_id, hours=12)

        prompt = f"""Forecast deterioration risk for the next {hours} hours for this ICU patient.
Return JSON with: "deterioration_score" (0-100), "confidence" (0-100), "explanation", 
"suggested_interventions" (list), "risk_trend" ("improving"/"stable"/"declining"),
"key_risks": [list of {{"condition", "probability", "warning"}}]

Patient: Stay {patient_id}, Stability {patient.get('stability_score', 'N/A')}/100
Category: {patient.get('stability_category', 'N/A')}
Current Vitals: {json.dumps({k: v for k, v in vitals.items() if v is not None}, default=str)}
Recent history: {len(history)} data points in last 12h

Return ONLY valid JSON."""

        result = await self.groq.clinical_complete([{"role": "user", "content": prompt}])
        if not result or not result.get("content"):
            return self._rule_based_forecast(patient, vitals, hours)

        try:
            return json.loads(result["content"])
        except (json.JSONDecodeError, TypeError):
            extracted = self._extract_json(result["content"])
            if extracted:
                try:
                    return json.loads(extracted)
                except (json.JSONDecodeError, TypeError):
                    pass
            return self._rule_based_forecast(patient, vitals, hours)

    def _rule_based_forecast(self, patient: dict, vitals: dict, hours: int) -> dict:
        score = patient.get("stability_score", 50)
        base = 100 - score
        time_factor = math.sqrt(hours / 3)
        deterioration = min(95, base * time_factor)
        hr = vitals.get("heart_rate") or 80
        sbp = vitals.get("sbp") or 120
        spo2 = vitals.get("spo2") or 97
        worsening = (hr > 110) + (sbp < 90) + (spo2 < 92)
        deterioration += worsening * 5 * time_factor
        deterioration = min(95, deterioration)
        conf = max(40, 80 - (hours * 3))

        return {
            "deterioration_score": round(deterioration),
            "confidence": round(conf),
            "explanation": f"Based on stability score ({score}) and vital sign trends over {hours}h window",
            "suggested_interventions": ["Monitor vitals hourly", "Review lab results", "Maintain current care level"],
            "risk_trend": "declining" if worsening >= 2 else ("stable" if worsening == 0 else "monitoring"),
            "key_risks": [],
        }

    async def detect_deterioration(self, patient_id: str, history: list) -> dict:
        now = self.engine.clock.get_current_time().timestamp() if self.engine else __import__('time').time()
        cached = self._det_cache.get(patient_id)
        if cached and (now - cached[0]) < DET_CACHE_TTL:
            return cached[1]

        if not history or len(history) < 2:
            return {"has_deteriorated": False, "confidence": 0, "description": "Insufficient data"}

        vitals = [h for h in history if h.get("charttime")]
        if len(vitals) < 2:
            return {"has_deteriorated": False, "confidence": 0, "description": "Insufficient data points"}

        prompt = f"""Analyze this vital sign history for signs of deterioration. Return JSON:
{{"has_deteriorated": true/false, "confidence": 0-100, "description": "...", "indicators": ["..."], "severity": "low"/"medium"/"high"/"critical"}}

History (latest first): {json.dumps(vitals[-10:], default=str)}"""

        result = await self.groq.clinical_complete([{"role": "user", "content": prompt}])
        if not result or not result.get("content"):
            result_dict = self._rule_based_deterioration(vitals)
            self._det_cache[patient_id] = (now, result_dict)
            return result_dict

        try:
            result_dict = json.loads(result["content"])
            self._det_cache[patient_id] = (now, result_dict)
            return result_dict
        except (json.JSONDecodeError, TypeError):
            extracted = self._extract_json(result["content"])
            if extracted:
                try:
                    result_dict = json.loads(extracted)
                    self._det_cache[patient_id] = (now, result_dict)
                    return result_dict
                except (json.JSONDecodeError, TypeError):
                    pass
            result_dict = self._rule_based_deterioration(vitals)
            self._det_cache[patient_id] = (now, result_dict)
            return result_dict

    def _rule_based_deterioration(self, vitals: list) -> dict:
        if len(vitals) < 2:
            return {"has_deteriorated": False, "confidence": 0, "description": "Insufficient data"}
        latest = vitals[-1]
        earlier = vitals[0]
        indicators = []
        if latest.get("spo2") and earlier.get("spo2") and latest["spo2"] < earlier["spo2"] - 3:
            indicators.append("SpO2 declining")
        if latest.get("heart_rate") and earlier.get("heart_rate") and latest["heart_rate"] > earlier["heart_rate"] + 10:
            indicators.append("HR rising")
        if latest.get("sbp") and earlier.get("sbp") and latest["sbp"] < earlier["sbp"] - 10:
            indicators.append("BP dropping")
        if latest.get("temperature") and earlier.get("temperature") and latest["temperature"] > earlier["temperature"] + 1:
            indicators.append("Temperature rising")
        severity = "critical" if len(indicators) >= 3 else ("high" if len(indicators) >= 2 else ("medium" if len(indicators) == 1 else "low"))
        return {
            "has_deteriorated": len(indicators) >= 2,
            "confidence": min(90, 50 + len(indicators) * 15),
            "description": "; ".join(indicators) if indicators else "No significant deterioration detected",
            "indicators": indicators,
            "severity": severity,
        }

    def _fallback_risks(self, patient: dict | None = None, vitals: dict | None = None) -> dict:
        if not patient:
            patient = {}
        if not vitals:
            vitals = {}
        hr = vitals.get("heart_rate") or 80
        sbp = vitals.get("sbp") or 120
        spo2 = vitals.get("spo2") or 97
        temp = vitals.get("temperature") or 37.0
        score = patient.get("stability_score", 50)

        def risk(base, factors, max_r=95):
            return min(max_r, base + factors)

        return {
            "mortality_risk": {"riskPercentage": risk(5, (hr > 120) * 20 + (sbp < 90) * 25 + (spo2 < 90) * 20 + (temp > 39) * 10), "confidence": 65, "contributors": [], "recommendation": "ICU level care"},
            "sepsis_risk": {"riskPercentage": risk(5, (temp > 38.3) * 25 + (hr > 90) * 15 + (sbp < 100) * 15), "confidence": 70, "contributors": [], "recommendation": "Monitor qSOFA"},
            "cardiac_arrest_risk": {"riskPercentage": risk(3, (hr > 110) * 15 + (sbp < 90) * 20), "confidence": 68, "contributors": [], "recommendation": "Continuous ECG monitoring"},
            "respiratory_failure_risk": {"riskPercentage": risk(5, (spo2 < 94) * 20 + (spo2 < 90) * 30), "confidence": 72, "contributors": [], "recommendation": "Monitor SpO₂, consider ABG"},
            "icu_transfer_risk": {"riskPercentage": risk(10, (100 - score) * 0.3), "confidence": 60, "contributors": [], "recommendation": "Evaluate transfer criteria"},
            "readmission_risk": {"riskPercentage": risk(10, (100 - score) * 0.4), "confidence": 55, "contributors": [], "recommendation": "Comprehensive discharge planning"},
            "organ_failure_risk": {"riskPercentage": risk(5, (sbp < 90) * 20 + (spo2 < 90) * 15), "confidence": 62, "contributors": [], "recommendation": "Monitor end-organ function"},
            "length_of_stay_risk": {"riskPercentage": risk(20, (100 - score) * 0.5), "confidence": 58, "contributors": ["Stability score: {score}"], "recommendation": "Early mobilization protocol"},
            "fall_risk": {"riskPercentage": risk(5, (vitals.get("sbp", 120) < 100) * 10 + (patient.get("age", 50) > 65) * 20), "confidence": 65, "contributors": [], "recommendation": "Fall precautions"},
            "medication_complication_risk": {"riskPercentage": risk(10, (score < 50) * 15), "confidence": 55, "contributors": [], "recommendation": "Review medication interactions"},
            "forecasts": {
                "1h": self._rule_based_forecast(patient, vitals, 1),
                "3h": self._rule_based_forecast(patient, vitals, 3),
                "6h": self._rule_based_forecast(patient, vitals, 6),
                "12h": self._rule_based_forecast(patient, vitals, 12),
            },
        }
