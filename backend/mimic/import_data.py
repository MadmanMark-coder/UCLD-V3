"""
Import MIMIC-IV Demo v2.2 into mimic4.db.

Run: python -m backend.mimic.import_data

Downloads the dataset from PhysioNet (if not cached), extracts CSVs,
and builds the SQLite database using MIT-LCP's official import script.
"""

import os
import sys
import zipfile
import urllib.request
import subprocess
import shutil
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DEMO_ZIP_URL = "https://physionet.org/files/mimiciv-demo/2.2/mimic-iv-demo-2.2.zip"
IMPORT_SCRIPT_URL = (
    "https://raw.githubusercontent.com/MIT-LCP/mimic-iv/"
    "main/buildmimic/sqlite/import.py"
)
ZIP_PATH = DATA_DIR / "mimic-iv-demo-2.2.zip"
EXTRACT_DIR = DATA_DIR / "mimic-iv-demo"
IMPORT_SCRIPT = DATA_DIR / "import_mimic.py"
OUTPUT_DB = DATA_DIR / "mimic4.db"


def download_file(url: str, dest: Path):
    if dest.exists():
        print(f"Already downloaded: {dest.name}")
        return
    print(f"Downloading {url} -> {dest.name}...")
    urllib.request.urlretrieve(url, dest)
    print("Download complete.")


def extract_zip(zip_path: Path, extract_to: Path):
    if extract_to.exists():
        print(f"Already extracted: {extract_to}")
        return
    print(f"Extracting {zip_path.name}...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)
    print("Extraction complete.")


def download_import_script(url: str, dest: Path):
    if dest.exists():
        print(f"Import script already exists: {dest.name}")
        return
    print(f"Downloading import script...")
    urllib.request.urlretrieve(url, dest)
    print("Import script downloaded.")


def main():
    DATA_DIR.mkdir(exist_ok=True)

    print("=== MIMIC-IV Demo v2.2 Import ===")

    if OUTPUT_DB.exists():
        print(f"mimic4.db already exists at {OUTPUT_DB}")
        print("Delete it and re-run if you want to re-import.")
        return

    download_file(DEMO_ZIP_URL, ZIP_PATH)
    extract_zip(ZIP_PATH, EXTRACT_DIR)
    download_import_script(IMPORT_SCRIPT_URL, IMPORT_SCRIPT)

    csv_dir = EXTRACT_DIR / "mimic-iv-demo-2.2"

    print("Running official import script...")
    result = subprocess.run(
        [sys.executable, str(IMPORT_SCRIPT), str(csv_dir), str(OUTPUT_DB)],
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print("Import failed:", result.stderr)
        sys.exit(1)

    db_size = OUTPUT_DB.stat().st_size / (1024 * 1024)
    print(f"Import complete. Database size: {db_size:.1f} MB")

    print("Cleaning up import script...")
    IMPORT_SCRIPT.unlink(missing_ok=True)

    print("Done. Data is ready for replay engine.")


if __name__ == "__main__":
    main()
