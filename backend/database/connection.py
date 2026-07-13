import aiosqlite
from contextlib import asynccontextmanager
from backend.config import settings


@asynccontextmanager
async def get_mimic_db():
    db = await aiosqlite.connect(
        settings.MIMIC_DB_URL,
        isolation_level=None,
        check_same_thread=False,
    )
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


@asynccontextmanager
async def get_ucld_db():
    db = await aiosqlite.connect(
        settings.UCLD_DB_URL,
        isolation_level=None,
        check_same_thread=False,
    )
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
