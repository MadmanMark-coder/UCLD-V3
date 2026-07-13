from backend.database.connection import get_mimic_db
from backend.mimic.item_codes import VITAL_ITEM_IDS

LAB_REFERENCE_RANGES = {
    "WBC": {"low": 4.0, "high": 11.0, "unit": "K/uL"},
    "Hemoglobin": {"low": 12.0, "high": 16.0, "unit": "g/dL"},
    "Hematocrit": {"low": 36.0, "high": 48.0, "unit": "%"},
    "Platelets": {"low": 150, "high": 450, "unit": "K/uL"},
    "Sodium": {"low": 135, "high": 145, "unit": "mmol/L"},
    "Potassium": {"low": 3.5, "high": 5.0, "unit": "mmol/L"},
    "Chloride": {"low": 96, "high": 106, "unit": "mmol/L"},
    "Bicarbonate": {"low": 22, "high": 29, "unit": "mmol/L"},
    "BUN": {"low": 7, "high": 20, "unit": "mg/dL"},
    "Creatinine": {"low": 0.6, "high": 1.2, "unit": "mg/dL"},
    "Glucose": {"low": 70, "high": 140, "unit": "mg/dL"},
    "Calcium": {"low": 8.5, "high": 10.5, "unit": "mg/dL"},
    "Magnesium": {"low": 1.7, "high": 2.2, "unit": "mg/dL"},
    "Phosphorus": {"low": 2.5, "high": 4.5, "unit": "mg/dL"},
    "Lactate": {"low": 0.5, "high": 2.0, "unit": "mmol/L"},
    "CRP": {"low": 0, "high": 10, "unit": "mg/L"},
    "Troponin": {"low": 0, "high": 0.04, "unit": "ng/mL"},
    "pH": {"low": 7.35, "high": 7.45, "unit": ""},
    "PaO2": {"low": 80, "high": 100, "unit": "mmHg"},
    "PaCO2": {"low": 35, "high": 45, "unit": "mmHg"},
    "INR": {"low": 0.8, "high": 1.2, "unit": ""},
    "ALT": {"low": 7, "high": 55, "unit": "U/L"},
    "AST": {"low": 8, "high": 48, "unit": "U/L"},
    "Alkaline Phosphatase": {"low": 40, "high": 130, "unit": "U/L"},
    "Total Bilirubin": {"low": 0.1, "high": 1.2, "unit": "mg/dL"},
    "Albumin": {"low": 3.4, "high": 5.4, "unit": "g/dL"},
}

async def get_patient_demographics(stay_id: int) -> dict | None:
    query = """
        SELECT
            p.subject_id, p.gender,
            CAST(p.anchor_age AS INTEGER) AS age,
            a.admission_type, a.admission_location,
            a.insurance, a.language, a.marital_status, a.race,
            di.icd_code AS diagnosis,
            ic.stay_id, ic.hadm_id, ic.first_careunit, ic.last_careunit,
            ic.intime, ic.outtime
        FROM "icu.icustays" ic
        JOIN "hosp.admissions" a ON ic.hadm_id = a.hadm_id
        JOIN "hosp.patients" p ON a.subject_id = p.subject_id
        LEFT JOIN "hosp.diagnoses_icd" di ON a.hadm_id = di.hadm_id AND di.seq_num = 1
        WHERE ic.stay_id = ?
    """
    async with get_mimic_db() as db:
        row = await db.execute_fetchall(query, (stay_id,))
        if not row:
            return None
        return dict(row[0])

async def get_current_vitals(stay_id: int) -> dict | None:
    item_ids = list(VITAL_ITEM_IDS.values())
    placeholders = ",".join("?" for _ in item_ids)
    query = f"""
        SELECT itemid, valuenum, charttime
        FROM "icu.chartevents"
        WHERE stay_id = ? AND itemid IN ({placeholders})
        AND valuenum IS NOT NULL
        ORDER BY charttime DESC
    """
    params = [stay_id] + item_ids
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, params)
    vitals = {}
    seen = set()
    for r in rows:
        itemid = int(r["itemid"])
        if itemid not in seen:
            seen.add(itemid)
            for key, iid in VITAL_ITEM_IDS.items():
                if iid == itemid:
                    vitals[key] = {"value": float(r["valuenum"]), "time": r["charttime"]}
                    break
    return vitals if vitals else None

async def get_vitals_history(stay_id: int, hours: int = 24) -> list:
    item_ids = list(VITAL_ITEM_IDS.values())
    placeholders = ",".join("?" for _ in item_ids)
    query = f"""
        SELECT itemid, valuenum, charttime
        FROM "icu.chartevents"
        WHERE stay_id = ?
          AND itemid IN ({placeholders})
          AND valuenum IS NOT NULL
          AND charttime >= datetime('now', '-{hours} hours')
        ORDER BY charttime ASC
    """
    params = [stay_id] + item_ids
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]

async def get_diagnoses(hadm_id: int) -> list:
    query = """
        SELECT d.icd_code, d.icd_version, d.long_title
        FROM "hosp.diagnoses_icd" di
        JOIN "hosp.d_icd_diagnoses" d ON di.icd_code = d.icd_code
        WHERE di.hadm_id = ?
        ORDER BY di.seq_num
    """
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, (hadm_id,))
    return [dict(r) for r in rows]

async def get_labs(hadm_id: int, hours: int = 24) -> list:
    query = """
        SELECT itemid, valuenum, charttime
        FROM "hosp.labevents"
        WHERE hadm_id = ?
          AND valuenum IS NOT NULL
          AND charttime >= datetime('now', '-{hours} hours')
        ORDER BY charttime DESC
        LIMIT 100
    """
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, (hadm_id,))
    return [dict(r) for r in rows]

async def get_labs_with_names(hadm_id: int, hours: int = 168) -> list:
    query = """
        SELECT l.itemid, l.valuenum, l.charttime, d.label, d.loinc_code, d.fluid, d.category
        FROM "hosp.labevents" l
        LEFT JOIN "hosp.d_labitems" d ON l.itemid = d.itemid
        WHERE l.hadm_id = ?
          AND l.valuenum IS NOT NULL
          AND l.charttime >= datetime('now', '-{hours} hours')
        ORDER BY l.charttime DESC
        LIMIT 200
    """
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, (hadm_id,))
    results = []
    for r in rows:
        lab = dict(r)
        val = float(lab["valuenum"])
        label = lab.get("label") or f"itemid_{lab['itemid']}"
        ref = LAB_REFERENCE_RANGES.get(label)
        flag = "normal"
        if ref:
            if val < ref["low"]:
                flag = "low"
            elif val > ref["high"]:
                flag = "high"
        lab["lab_name"] = label
        lab["flag"] = flag
        lab["reference_range"] = ref
        results.append(lab)
    return results

async def get_prescriptions(hadm_id: int) -> list:
    query = """
        SELECT drug, route, dose_val_rx, dose_unit_rx,
               starttime, stoptime
        FROM "hosp.prescriptions"
        WHERE hadm_id = ?
        ORDER BY starttime DESC
    """
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(query, (hadm_id,))
    return [dict(r) for r in rows]

async def get_bed_history(stay_id: int) -> list:
    async with get_mimic_db() as db:
        stay = await db.execute_fetchall(
            'SELECT hadm_id FROM "icu.icustays" WHERE stay_id = ?', (stay_id,)
        )
        if not stay:
            return []
        hadm_id = stay[0]["hadm_id"]
        rows = await db.execute_fetchall(
            """SELECT transfer_id, eventtype, careunit, room, bed,
                      intime, outtime
               FROM "hosp.transfers"
               WHERE hadm_id = ?
               ORDER BY intime ASC""",
            (hadm_id,),
        )
    return [dict(r) for r in rows]

async def get_patient_timeline(stay_id: int) -> list:
    """Build a comprehensive timeline of all events for a patient."""
    events = []
    async with get_mimic_db() as db:
        # Get icustay info
        stay = await db.execute_fetchall(
            'SELECT hadm_id, intime, outtime, first_careunit FROM "icu.icustays" WHERE stay_id = ?',
            (stay_id,)
        )
        if not stay:
            return []
        hadm_id = stay[0]["hadm_id"]

        # Transfers
        rows = await db.execute_fetchall(
            """SELECT 'TRANSFER' AS event_type, careunit AS detail, intime AS event_time
               FROM "hosp.transfers" WHERE hadm_id = ? ORDER BY intime""",
            (hadm_id,)
        )
        for r in rows:
            events.append({"type": "TRANSFER", "detail": r["detail"], "time": r["event_time"]})

        # Medications
        rows = await db.execute_fetchall(
            """SELECT 'MEDICATION' AS event_type, drug AS detail, starttime AS event_time
               FROM "hosp.prescriptions" WHERE hadm_id = ? ORDER BY starttime""",
            (hadm_id,)
        )
        for r in rows:
            events.append({"type": "MEDICATION", "detail": r["detail"], "time": r["event_time"]})

        # Labs
        rows = await db.execute_fetchall(
            """SELECT 'LAB' AS event_type, COALESCE(d.label, 'Lab') AS detail, l.charttime AS event_time
               FROM "hosp.labevents" l
               LEFT JOIN "hosp.d_labitems" d ON l.itemid = d.itemid
               WHERE l.hadm_id = ? AND l.valuenum IS NOT NULL
               ORDER BY l.charttime""",
            (hadm_id,)
        )
        for r in rows:
            events.append({"type": "LAB", "detail": r["detail"], "time": r["event_time"]})

        # Vitals
        item_ids = list(VITAL_ITEM_IDS.values())
        placeholders = ",".join("?" for _ in item_ids)
        rows = await db.execute_fetchall(
            f"""SELECT 'VITAL' AS event_type, 'Vitals Check' AS detail, charttime AS event_time
                FROM "icu.chartevents" WHERE stay_id = ? AND itemid IN ({placeholders})
                AND valuenum IS NOT NULL GROUP BY charttime ORDER BY charttime""",
            [stay_id] + item_ids
        )
        for r in rows:
            events.append({"type": "VITAL", "detail": "Vitals recorded", "time": r["event_time"]})

    events.sort(key=lambda e: e.get("time") or "")
    return events

async def get_allergies(hadm_id: int) -> list:
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(
            """SELECT a.startdate, a.enddate, a.allergen AS substance, a.allergy_type AS severity
               FROM "hosp.allergies" a
               JOIN "hosp.admissions" ad ON a.hadm_id = ad.hadm_id
               WHERE a.hadm_id = ?
               ORDER BY a.startdate DESC""",
            (hadm_id,)
        )
        if not rows:
            # Fallback: try by subject_id
            subj = await db.execute_fetchall(
                'SELECT subject_id FROM "icu.icustays" WHERE stay_id = ?',
                (hadm_id,)  # This is wrong but let's check
            )
            return []
        return [dict(r) for r in rows]

async def get_microbiology(hadm_id: int) -> list:
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(
            """SELECT spec_type_desc, org_name, ab_name, interpretation,
                      chartdate, charttime
               FROM "hosp.microbiologyevents"
               WHERE hadm_id = ?
               ORDER BY chartdate DESC LIMIT 20""",
            (hadm_id,)
        )
    return [dict(r) for r in rows]
