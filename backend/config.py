import os
from pathlib import Path
from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path)


class Settings:
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATA_DIR.mkdir(exist_ok=True)

    MIMIC_DB_PATH: Path = Path(os.getenv("MIMIC_DB_PATH", str(DATA_DIR / "mimic4.db")))
    if not MIMIC_DB_PATH.is_absolute():
        MIMIC_DB_PATH = (BASE_DIR / MIMIC_DB_PATH).resolve()

    UCLD_DB_PATH: Path = Path(os.getenv("UCLD_DB_PATH", str(DATA_DIR / "ucld.db")))
    if not UCLD_DB_PATH.is_absolute():
        UCLD_DB_PATH = (BASE_DIR / UCLD_DB_PATH).resolve()

    AI_API_KEY: str = os.getenv("AI_API_KEY", "")

    GROQ_MODELS: dict = {
        "clinical": "llama-3.1-8b-instant",
        "operations": "llama-3.1-8b-instant",
        "voice": "meta-llama/llama-4-scout-17b-16e-instruct",
    }

    REPLAY_DEFAULT_SPEED: int = int(os.getenv("REPLAY_DEFAULT_SPEED", "5"))
    WS_HOST: str = os.getenv("WS_HOST", "0.0.0.0")
    WS_PORT: int = int(os.getenv("WS_PORT", "8000"))
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5175", "http://127.0.0.1:5175"]

    @property
    def MIMIC_DB_URL(self) -> str:
        return str(self.MIMIC_DB_PATH)

    @property
    def UCLD_DB_URL(self) -> str:
        return str(self.UCLD_DB_PATH)


settings = Settings()
