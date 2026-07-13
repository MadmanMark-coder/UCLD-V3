"""
Import MIMIC-IV Demo v2.2 from local CSV files into mimic4.db.
Run: python -m backend.mimic.import_local
"""

import csv
import gzip
import sqlite3
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MIMIC_CSV_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "mimic-iv-clinical-database-demo-2.2" / "mimic-iv-clinical-database-demo-2.2"
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "mimic4.db"

HOSP_TABLES = [
    "admissions", "diagnoses_icd", "drgcodes", "d_hcpcs",
    "d_icd_diagnoses", "d_icd_procedures", "d_labitems",
    "emar", "emar_detail", "hcpcsevents", "labevents",
    "microbiologyevents", "omr", "patients", "pharmacy",
    "poe", "poe_detail", "prescriptions", "procedures_icd",
    "provider", "services", "transfers",
]

ICU_TABLES = [
    "caregiver", "chartevents", "datetimeevents", "d_items",
    "icustays", "ingredientevents", "inputevents",
    "outputevents", "procedureevents",
]


def import_table(conn: sqlite3.Connection, schema: str, table: str, csv_path: Path):
    logger.info("  %s.%s ...", schema, table)
    with gzip.open(csv_path, "rt") as f:
        reader = csv.reader(f)
        headers = next(reader)
        placeholders = ",".join("?" for _ in headers)
        cols = ",".join(f'"{c}"' for c in headers)

        conn.execute(f'DROP TABLE IF EXISTS "{schema}.{table}"')
        conn.execute(f'CREATE TABLE "{schema}.{table}" ({", ".join(f'"{c}" TEXT' for c in headers)})')

        rows = list(reader)
        for i in range(0, len(rows), 1000):
            batch = rows[i:i + 1000]
            conn.executemany(f'INSERT INTO "{schema}.{table}" ({cols}) VALUES ({placeholders})', batch)

    logger.info("    -> %d rows", len(rows))


def create_indexes(conn: sqlite3.Connection):
    logger.info("Creating indexes...")
    indexes = [
        'CREATE INDEX IF NOT EXISTS idx_chartevents_stay ON "icu.chartevents"(stay_id)',
        'CREATE INDEX IF NOT EXISTS idx_chartevents_item ON "icu.chartevents"(itemid)',
        'CREATE INDEX IF NOT EXISTS idx_icustays_subject ON "icu.icustays"(subject_id)',
        'CREATE INDEX IF NOT EXISTS idx_admissions_subject ON "hosp.admissions"(subject_id)',
        'CREATE INDEX IF NOT EXISTS idx_diagnoses_icd_hadm ON "hosp.diagnoses_icd"(hadm_id)',
        'CREATE INDEX IF NOT EXISTS idx_labevents_hadm ON "hosp.labevents"(hadm_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_hadm ON "hosp.prescriptions"(hadm_id)',
        'CREATE INDEX IF NOT EXISTS idx_transfers_hadm ON "hosp.transfers"(hadm_id)',
    ]
    for idx in indexes:
        conn.execute(idx)
    conn.commit()


def main():
    db_path = DB_PATH
    csv_root = MIMIC_CSV_ROOT

    if not csv_root.exists():
        logger.error("MIMIC CSV root not found at %s", csv_root)
        return

    hosp_dir = csv_root / "hosp"
    icu_dir = csv_root / "icu"

    if not hosp_dir.exists() or not icu_dir.exists():
        logger.error("hosp/ or icu/ directory missing")
        return

    if db_path.exists():
        db_path.unlink()
        logger.info("Removed existing %s", db_path)

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-64000")

    logger.info("=== Importing HOSP tables ===")
    for table in HOSP_TABLES:
        csv_file = hosp_dir / f"{table}.csv.gz"
        if csv_file.exists():
            import_table(conn, "hosp", table, csv_file)
        else:
            logger.warning("  SKIP %s (not found)", csv_file.name)

    logger.info("=== Importing ICU tables ===")
    for table in ICU_TABLES:
        csv_file = icu_dir / f"{table}.csv.gz"
        if csv_file.exists():
            import_table(conn, "icu", table, csv_file)
        else:
            logger.warning("  SKIP %s (not found)", csv_file.name)

    conn.commit()
    create_indexes(conn)

    # Verify
    for schema, table in [("icu", "icustays"), ("icu", "chartevents"), ("hosp", "patients"), ("hosp", "admissions")]:
        cur = conn.execute(f'SELECT COUNT(*) FROM "{schema}.{table}"')
        count = cur.fetchone()[0]
        logger.info("%s.%s: %d rows", schema, table, count)

    db_size = db_path.stat().st_size / (1024 * 1024)
    logger.info("Import complete. Database size: %.1f MB", db_size)
    conn.close()


if __name__ == "__main__":
    main()
