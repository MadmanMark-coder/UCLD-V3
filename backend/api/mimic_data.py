from fastapi import APIRouter
from backend.database.connection import get_mimic_db

router = APIRouter(prefix="/api/mimic", tags=["mimic"])


@router.get("/patients")
async def all_patients():
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(
            """SELECT p.subject_id, p.gender,
                      CAST(p.anchor_age AS INTEGER) AS age,
                      p.anchor_year, p.dod
               FROM "hosp.patients" p
               ORDER BY p.subject_id"""
        )
    return [dict(r) for r in rows]


@router.get("/admissions")
async def all_admissions():
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(
            """SELECT * FROM "hosp.admissions" ORDER BY admittime DESC"""
        )
    return [dict(r) for r in rows]


@router.get("/icustays")
async def all_icustays():
    async with get_mimic_db() as db:
        rows = await db.execute_fetchall(
            """SELECT ic.*, p.gender, CAST(p.anchor_age AS INTEGER) AS age,
                      di.icd_code AS diagnosis
               FROM "icu.icustays" ic
               JOIN "hosp.patients" p ON ic.subject_id = p.subject_id
               LEFT JOIN "hosp.diagnoses_icd" di ON ic.hadm_id = di.hadm_id AND di.seq_num = 1
               ORDER BY ic.intime DESC"""
        )
    return [dict(r) for r in rows]
