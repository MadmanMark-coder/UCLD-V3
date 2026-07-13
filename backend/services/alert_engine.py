import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

THRESHOLD_RULES = [
    {"vital": "spo2", "critical_direction": "low", "critical_value": 90, "severity": "critical", "title": "SpO₂ Critical Low"},
    {"vital": "heart_rate", "critical_direction": "high", "critical_value": 130, "severity": "critical", "title": "Heart Rate Critical High"},
    {"vital": "sbp", "critical_direction": "low", "critical_value": 80, "severity": "critical", "title": "Systolic BP Critical Low"},
    {"vital": "resp_rate", "critical_direction": "high", "critical_value": 30, "severity": "critical", "title": "Respiratory Rate Critical High"},
    {"vital": "temperature", "critical_direction": "high", "critical_value": 39, "severity": "critical", "title": "Temperature Critical High"},
    {"vital": "heart_rate", "critical_direction": "low", "critical_value": 45, "severity": "critical", "title": "Heart Rate Critical Low"},
    {"vital": "sbp", "critical_direction": "high", "critical_value": 200, "severity": "critical", "title": "Systolic BP Critical High"},
]

TREND_RULES = [
    {"vital": "spo2", "drop_pct": 5, "minutes": 30, "severity": "warning", "title": "SpO₂ Dropping Rapidly"},
    {"vital": "heart_rate", "rise_bpm": 20, "minutes": 60, "severity": "warning", "title": "Heart Rate Climbing"},
    {"vital": "sbp", "drop_mmhg": 15, "minutes": 60, "severity": "critical", "title": "Systolic BP Dropping"},
    {"vital": "resp_rate", "rise_bpm": 8, "minutes": 60, "severity": "warning", "title": "Respiratory Rate Rising"},
]

PATTERN_RULES = [
    {
        "name": "sepsis_pattern",
        "title": "Sepsis Pattern Detected",
        "severity": "critical",
        "requires": ["hr_high", "temp_high", "sbp_low", "rr_high"],
        "description": "Elevated HR + temperature + low BP + high RR may indicate sepsis.",
    },
    {
        "name": "respiratory_decline",
        "title": "Respiratory Decline Pattern",
        "severity": "warning",
        "requires": ["spo2_low", "rr_high"],
        "description": "Low SpO₂ with elevated respiratory rate suggests respiratory distress.",
    },
    {
        "name": "cardiac_instability",
        "title": "Cardiac Instability Pattern",
        "severity": "critical",
        "requires": ["hr_volatile", "bp_volatile"],
        "description": "Heart rate and blood pressure fluctuations indicate cardiac instability.",
    },
]

DEDUP_SECONDS = 60


class AlertEngine:
    def __init__(self):
        self._fired: dict[str, float] = {}

    def evaluate_vitals(
        self,
        stay_id: int,
        new_vitals: dict,
        recent_history: list[dict],
        current_time: datetime | None = None,
    ) -> list[dict]:
        now = current_time or datetime.now(timezone.utc)
        now_ts = now.timestamp()
        alerts = []

        # Layer 1: Threshold
        for rule in THRESHOLD_RULES:
            val = new_vitals.get(rule["vital"])
            if val is None:
                continue
            triggered = False
            if rule["critical_direction"] == "low" and val <= rule["critical_value"]:
                triggered = True
            elif rule["critical_direction"] == "high" and val >= rule["critical_value"]:
                triggered = True
            if triggered:
                dedup_key = f"threshold:{rule['vital']}:{stay_id}"
                if self._can_fire(dedup_key, now_ts):
                    alerts.append(self._build_alert(stay_id, rule["severity"], "threshold", rule["title"], rule.get("vital"), val, now))
                    self._mark_fired(dedup_key, now_ts)

        # Layer 2: Trend
        for rule in TREND_RULES:
            dedup_key = f"trend:{rule['vital']}:{stay_id}"
            if not self._can_fire(dedup_key, now_ts):
                continue
            alert = self._check_trend(rule, stay_id, new_vitals, recent_history, now, now_ts)
            if alert:
                alerts.append(alert)
                self._mark_fired(dedup_key, now_ts)

        # Layer 3: Pattern
        flags = self._compute_pattern_flags(new_vitals)
        for pattern in PATTERN_RULES:
            required = set(pattern["requires"])
            if required.intersection(flags) == required:
                dedup_key = f"pattern:{pattern['name']}:{stay_id}"
                if self._can_fire(dedup_key, now_ts):
                    alerts.append(self._build_alert(stay_id, pattern["severity"], "pattern", pattern["title"], None, None, now, pattern["description"]))
                    self._mark_fired(dedup_key, now_ts)

        return alerts

    def _check_trend(self, rule: dict, stay_id: int, new_vitals: dict, history: list[dict], now: datetime, now_ts: float) -> dict | None:
        current_val = new_vitals.get(rule["vital"])
        if current_val is None or not history:
            return None

        cutoff = now.timestamp() - rule["minutes"] * 60
        older = [h for h in history if self._parse_ts(h.get("charttime", "")) <= cutoff]
        if not older:
            return None

        older_val = older[-1].get(rule["vital"])
        if older_val is None:
            return None

        triggered = False
        if "drop_pct" in rule and older_val - current_val >= rule["drop_pct"]:
            triggered = True
        elif "rise_bpm" in rule and current_val - older_val >= rule["rise_bpm"]:
            triggered = True
        elif "drop_mmhg" in rule and older_val - current_val >= rule["drop_mmhg"]:
            triggered = True

        if triggered:
            return self._build_alert(stay_id, rule["severity"], "trend", rule["title"], rule["vital"], current_val, now)
        return None

    def _compute_pattern_flags(self, vitals: dict) -> set:
        flags = set()
        hr = vitals.get("heart_rate")
        if hr and hr > 100:
            flags.add("hr_high")
        if hr and (hr < 50 or abs(hr - (vitals.get("heart_rate") or 75)) > 20):
            flags.add("hr_volatile")
        temp = vitals.get("temperature")
        if temp and temp > 38:
            flags.add("temp_high")
        sbp = vitals.get("sbp")
        if sbp and sbp < 90:
            flags.add("sbp_low")
        if sbp and abs(sbp - (vitals.get("sbp") or 120)) > 20:
            flags.add("bp_volatile")
        rr = vitals.get("resp_rate")
        if rr and rr > 20:
            flags.add("rr_high")
        spo2 = vitals.get("spo2")
        if spo2 and spo2 < 95:
            flags.add("spo2_low")
        return flags

    def _can_fire(self, key: str, now_ts: float) -> bool:
        last = self._fired.get(key)
        return last is None or (now_ts - last) >= DEDUP_SECONDS

    def _mark_fired(self, key: str, now_ts: float):
        self._fired[key] = now_ts

    def _build_alert(self, stay_id: int, severity: str, category: str, title: str, vital: str | None, value: int | float | None, now: datetime, description: str | None = None) -> dict:
        body = {
            "id": str(uuid.uuid4()),
            "patient_id": str(stay_id),
            "stay_id": stay_id,
            "severity": severity,
            "category": category,
            "title": title,
            "description": description or f"{title} — {vital}: {value}" if vital and value is not None else title,
            "what_changed": f"{vital} changed to {value}" if vital and value is not None else "",
            "why_matters": self._why_matters(title),
            "confidence": 100 if category == "threshold" else 70 if category == "trend" else 50,
            "next_steps": "",
            "priority_score": self._calc_priority(severity, category),
            "acknowledged": False,
            "generated_at": now.isoformat(),
        }
        return body

    def _why_matters(self, title: str) -> str:
        explanations = {
            "SpO₂ Critical Low": "Hypoxia may indicate respiratory failure or airway obstruction.",
            "Heart Rate Critical High": "Tachycardia may indicate shock, hemorrhage, or arrhythmia.",
            "Heart Rate Critical Low": "Bradycardia may indicate heart block or medication effect.",
            "Systolic BP Critical Low": "Hypotension may indicate sepsis, bleeding, or cardiac failure.",
            "Systolic BP Critical High": "Hypertension increases risk of stroke or cardiac event.",
            "Respiratory Rate Critical High": "Tachypnea may indicate respiratory distress or metabolic acidosis.",
            "Temperature Critical High": "Hyperthermia may indicate severe infection or sepsis.",
            "SpO₂ Dropping Rapidly": "Rapid desaturation requires immediate airway assessment.",
            "Heart Rate Climbing": "Rising HR may indicate worsening shock or infection.",
            "Systolic BP Dropping": "Falling BP may precede circulatory collapse.",
            "Respiratory Rate Rising": "Increasing RR may indicate impending respiratory failure.",
        }
        return explanations.get(title, "This change may indicate clinical deterioration.")

    def _calc_priority(self, severity: str, category: str) -> int:
        base = {"emergency": 900, "critical": 700, "warning": 450, "info": 200}
        bonus = {"pattern": 50, "trend": 30, "threshold": 0}
        return base.get(severity, 300) + bonus.get(category, 0)

    @staticmethod
    def _parse_ts(ts: str) -> float:
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0
