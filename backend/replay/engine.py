import asyncio
import uuid
import logging
from datetime import datetime, timedelta, timezone

from backend.database.connection import get_mimic_db, get_ucld_db
from backend.mimic.item_codes import VITAL_ITEM_IDS
from backend.replay.time_manager import TimeManager
from backend.services.stability_score import calculate_stability_score
from backend.services.alert_engine import AlertEngine

logger = logging.getLogger(__name__)


def _parse_charttime(ct):
    if isinstance(ct, datetime):
        return ct
    return datetime.fromisoformat(ct.replace(" ", "T"))


class ReplayEngine:
    def __init__(self, ws_manager, speed: int = 5, emergency_coordinator=None):
        self.ws_manager = ws_manager
        self.clock = TimeManager(speed=speed)
        self.alert_engine = AlertEngine()
        self.emergency_coordinator = emergency_coordinator
        self.running = False
        self._task = None
        self.cohort_patients: dict[int, dict] = {}
        self.timeline: list[tuple[datetime, int, dict]] = []
        self._timeline_index = 0
        self.latest_vitals: dict[int, dict] = {}
        self._cohort_name = ""
        self._clinical_engine = None
        self._risk_timer: float = 0.0
        self._risk_interval: float = 300.0
        self._last_virtual_time: datetime | None = None

    async def load_cohort(self, stay_ids: list[int], cohort_name: str = "custom"):
        self.cohort_patients = {}
        self.timeline = []
        self._timeline_index = 0
        self.latest_vitals = {}
        self._cohort_name = cohort_name

        try:
            async with get_mimic_db() as db:
                for sid in stay_ids:
                    try:
                        demo = await self._fetch_demographics(db, sid)
                        if demo is None:
                            continue
                        self.cohort_patients[sid] = {
                            **demo,
                            "latest_vitals": {},
                            "stability_score": 80,
                            "stability_category": "stable",
                        }
                        vitals = await self._fetch_vitals(db, sid)
                        for vtime, vdata in vitals:
                            self.timeline.append((vtime, sid, vdata))
                    except Exception:
                        continue
        except Exception:
            pass

        self.timeline.sort(key=lambda x: x[0])

        if not self.timeline:
            logger.warning("No timeline entries loaded for cohort '%s'", cohort_name)
            return

        # Pre-calculate stability scores from latest vitals
        patients_with_vitals = 0
        for sid in self.cohort_patients:
            patient_vitals = [v for t, s, v in self.timeline if s == sid]
            if patient_vitals:
                patients_with_vitals += 1
                latest = patient_vitals[-1]
                score_result = calculate_stability_score(latest)
                self.cohort_patients[sid]["stability_score"] = score_result["score"]
                self.cohort_patients[sid]["stability_category"] = score_result["category"]
                self.latest_vitals[sid] = latest
                self.cohort_patients[sid]["latest_vitals"] = latest

        self.clock.reset(self.timeline[0][0])
        logger.info(
            "Loaded cohort '%s': %d patients, %d events, %d with vitals",
            cohort_name,
            len(self.cohort_patients),
            len(self.timeline),
            patients_with_vitals,
        )

    async def _fetch_demographics(self, db, stay_id: int) -> dict | None:
        query = """
            SELECT p.subject_id, p.gender,
                   CAST(p.anchor_age AS INTEGER) AS age,
                   di.icd_code AS admission_diagnosis,
                   ic.first_careunit, ic.hadm_id
            FROM "icu.icustays" ic
            JOIN "hosp.admissions" a ON ic.hadm_id = a.hadm_id
            JOIN "hosp.patients" p ON a.subject_id = p.subject_id
            LEFT JOIN "hosp.diagnoses_icd" di ON a.hadm_id = di.hadm_id AND di.seq_num = 1
            WHERE ic.stay_id = ?
        """
        rows = await db.execute_fetchall(query, (stay_id,))
        if not rows:
            return None
        return dict(rows[0])

    async def _fetch_vitals(self, db, stay_id: int) -> list:
        item_ids = list(VITAL_ITEM_IDS.values())
        placeholders = ",".join("?" for _ in item_ids)
        query = f"""
            SELECT itemid, valuenum, charttime
            FROM "icu.chartevents"
            WHERE stay_id = ? AND itemid IN ({placeholders})
              AND valuenum IS NOT NULL
            ORDER BY charttime ASC
        """
        params = [stay_id] + item_ids
        rows = await db.execute_fetchall(query, params)

        entries = {}
        for r in rows:
            ct = _parse_charttime(r["charttime"])
            ct = ct.replace(second=0, microsecond=0)
            if ct not in entries:
                entries[ct] = {}
            for key, iid in VITAL_ITEM_IDS.items():
                if int(r["itemid"]) == iid:
                    entries[ct][key] = float(r["valuenum"])
                    break

        return list(entries.items())

    def start(self):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Replay engine started")

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
        logger.info("Replay engine stopped")

    async def _run(self):
        while self.running and self._timeline_index < len(self.timeline):
            self.clock.tick()
            current_time = self.clock.get_current_time()

            # Track virtual time elapsed for risk timer
            if self._last_virtual_time is not None:
                delta = (current_time - self._last_virtual_time).total_seconds()
                self._risk_timer += max(0, delta)
            self._last_virtual_time = current_time

            while (
                self._timeline_index < len(self.timeline)
                and self.timeline[self._timeline_index][0] <= current_time
            ):
                _charttime, stay_id, vitals = self.timeline[self._timeline_index]
                self.latest_vitals[stay_id] = vitals
                self.cohort_patients[stay_id]["latest_vitals"] = vitals

                # Broadcast vitals
                await self.ws_manager.broadcast(
                    "VITALS_UPDATE",
                    {
                        "stay_id": stay_id,
                        "vitals": vitals,
                        "charttime": _charttime.isoformat(),
                    },
                )

                # Calculate stability score
                score_result = calculate_stability_score(vitals)
                self.cohort_patients[stay_id]["stability_score"] = score_result["score"]
                self.cohort_patients[stay_id]["stability_category"] = score_result["category"]

                # Evaluate alerts
                recent_history = self.get_patient_vitals_history(stay_id, hours=1)
                new_alerts = self.alert_engine.evaluate_vitals(
                    stay_id=stay_id,
                    new_vitals=vitals,
                    recent_history=recent_history,
                    current_time=current_time,
                )

                for alert in new_alerts:
                    await self._store_alert(alert)
                    await self.ws_manager.broadcast("ALERT_TRIGGERED", alert)
                    if self.emergency_coordinator:
                        await self.emergency_coordinator.create_incident(str(stay_id), alert)

                self._timeline_index += 1

            # Risk scoring cycle — every 5 minutes of virtual time
            if self._clinical_engine and self._risk_timer >= self._risk_interval:
                self._risk_timer = 0.0
                for stay_id in list(self.cohort_patients.keys()):
                    try:
                        risk_data = await self._clinical_engine.analyze_risks(str(stay_id))
                        if risk_data and "error" not in risk_data:
                            self.cohort_patients[stay_id]["risk_analysis"] = risk_data
                    except Exception as e:
                        logger.warning("Risk analysis failed for patient %s: %s", stay_id, e)

            if self._timeline_index >= len(self.timeline):
                await self.ws_manager.broadcast(
                    "REPLAY_FINISHED", {"message": "Replay completed"}
                )
                logger.info("Replay finished")
                break

            await asyncio.sleep(0.25)

    async def _store_alert(self, alert: dict):
        try:
            async with get_ucld_db() as db:
                await db.execute(
                    """INSERT INTO alert_log
                       (id, patient_id, stay_id, severity, category, title, description,
                        what_changed, why_matters, confidence, next_steps, priority_score,
                        acknowledged, generated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)""",
                    (
                        alert["id"],
                        alert["patient_id"],
                        alert["stay_id"],
                        alert["severity"],
                        alert["category"],
                        alert["title"],
                        alert["description"],
                        alert.get("what_changed", ""),
                        alert.get("why_matters", ""),
                        alert.get("confidence", 50),
                        alert.get("next_steps", ""),
                        alert.get("priority_score", 0),
                        alert["generated_at"],
                    ),
                )
        except Exception as e:
            logger.warning("Failed to store alert: %s", e)

    def get_current_patients(self) -> list:
        result = []
        for stay_id, data in self.cohort_patients.items():
            vitals = data.get("latest_vitals", {}) or {}
            result.append(
                {
                    "stay_id": stay_id,
                    "subject_id": data.get("subject_id"),
                    "gender": data.get("gender"),
                    "age": data.get("age"),
                    "admission_diagnosis": data.get("admission_diagnosis"),
                    "first_careunit": data.get("first_careunit"),
                    "latest_vitals": vitals,
                    "stability_score": data.get("stability_score", 80),
                    "stability_category": data.get("stability_category", "stable"),
                    "risk_analysis": data.get("risk_analysis"),
                }
            )
        priority = {
            "critical": 0,
            "high_risk": 1,
            "elevated": 2,
            "observation": 3,
            "stable": 4,
        }
        result.sort(key=lambda p: priority.get(p["stability_category"], 5))
        return result

    def get_patient_vitals_history(self, stay_id: int, hours: int = 24) -> list:
        if not self.timeline:
            return []
        current_time = self.clock.get_current_time()
        cutoff = current_time - timedelta(hours=hours)
        history = []
        for charttime, sid, vitals in self.timeline:
            if sid != stay_id:
                continue
            if charttime < cutoff:
                continue
            if charttime > current_time:
                break
            entry = {"charttime": charttime.isoformat()}
            entry.update(vitals)
            history.append(entry)
        return history

    def get_status(self) -> dict:
        return {
            "cohort_name": self._cohort_name,
            "patient_count": len(self.cohort_patients),
            "speed": self.clock._speed,
            "current_time": self.clock.get_current_time().isoformat(),
            "status": "playing" if self.running else "stopped",
        }
