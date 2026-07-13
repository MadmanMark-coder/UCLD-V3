import asyncio
from backend.database.connection import get_ucld_db

async def check():
    async with get_ucld_db() as db:
        beds = await db.execute_fetchall("SELECT COUNT(*) AS cnt FROM beds")
        equip = await db.execute_fetchall("SELECT COUNT(*) AS cnt FROM equipment")
        sessions = await db.execute_fetchall("SELECT COUNT(*) AS cnt FROM sessions")
        print(f"Beds: {beds[0]['cnt']}")
        print(f"Equipment: {equip[0]['cnt']}")
        print(f"Sessions: {sessions[0]['cnt']}")

asyncio.run(check())
