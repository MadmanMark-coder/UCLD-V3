from backend.database.connection import get_ucld_db


async def init_ucld_db():
    async with get_ucld_db() as db:
        statements = [
            """CREATE TABLE IF NOT EXISTS alert_log (
                id TEXT PRIMARY KEY,
                patient_id TEXT,
                stay_id INTEGER,
                severity TEXT CHECK(severity IN ('info','warning','critical','emergency')),
                category TEXT,
                title TEXT,
                description TEXT,
                what_changed TEXT,
                why_matters TEXT,
                confidence INTEGER,
                next_steps TEXT,
                priority_score INTEGER,
                acknowledged INTEGER DEFAULT 0,
                acknowledged_at TIMESTAMP,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                patient_id TEXT,
                stay_id INTEGER,
                type TEXT,
                status TEXT DEFAULT 'detected',
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                timeline TEXT,
                summary TEXT,
                alert_id TEXT REFERENCES alert_log(id)
            )""",
            """CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active_cohort TEXT
            )""",
            """CREATE TABLE IF NOT EXISTS equipment (
                id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT CHECK(type IN ('ventilator','defibrillator','infusion_pump','wheelchair','ultrasound','ecg','oxygen')),
                status TEXT DEFAULT 'available',
                location TEXT,
                department TEXT,
                battery_level INTEGER,
                last_maintenance TIMESTAMP,
                next_maintenance TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS beds (
                id TEXT PRIMARY KEY,
                room_number TEXT,
                department TEXT,
                bed_type TEXT CHECK(bed_type IN ('general','icu','pediatric','emergency','isolation','stepdown')),
                status TEXT DEFAULT 'available',
                current_patient_id TEXT,
                current_stay_id INTEGER,
                isolation_type TEXT
            )""",
            """CREATE TABLE IF NOT EXISTS patient_notes (
                id TEXT PRIMARY KEY,
                patient_id TEXT,
                content TEXT,
                category TEXT DEFAULT 'general',
                author TEXT DEFAULT 'Dr. Martinez',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS ai_interactions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                model_used TEXT,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                latency_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
        ]
        for stmt in statements:
            await db.execute(stmt)
    await seed_ucld_db()


async def seed_ucld_db():
    async with get_ucld_db() as db:
        existing = await db.execute_fetchall("SELECT COUNT(*) AS cnt FROM beds")
        if existing and existing[0]["cnt"] > 0:
            return

        beds_data = [
            ("B001", "201A", "MICU", "icu"),
            ("B002", "201B", "MICU", "icu"),
            ("B003", "201C", "MICU", "icu"),
            ("B004", "202A", "MICU", "icu"),
            ("B005", "202B", "MICU", "icu"),
            ("B006", "202C", "MICU", "icu"),
            ("B007", "203A", "SICU", "icu"),
            ("B008", "203B", "SICU", "icu"),
            ("B009", "203C", "SICU", "icu"),
            ("B010", "204A", "SICU", "icu"),
            ("B011", "204B", "SICU", "icu"),
            ("B012", "204C", "SICU", "icu"),
            ("B013", "301A", "CCU", "icu"),
            ("B014", "301B", "CCU", "icu"),
            ("B015", "301C", "CCU", "icu"),
            ("B016", "302A", "STEPDOWN", "stepdown"),
            ("B017", "302B", "STEPDOWN", "stepdown"),
            ("B018", "302C", "STEPDOWN", "stepdown"),
            ("B019", "303A", "STEPDOWN", "stepdown"),
            ("B020", "303B", "STEPDOWN", "stepdown"),
            ("B021", "101A", "ED", "emergency"),
            ("B022", "101B", "ED", "emergency"),
            ("B023", "102A", "ED", "emergency"),
            ("B024", "102B", "ED", "emergency"),
            ("B025", "401A", "MICU", "general"),
            ("B026", "401B", "MICU", "general"),
            ("B027", "402A", "SICU", "general"),
            ("B028", "402B", "SICU", "general"),
            ("B029", "501A", "CCU", "isolation"),
            ("B030", "501B", "CCU", "isolation"),
        ]
        for bed in beds_data:
            await db.execute(
                "INSERT OR IGNORE INTO beds (id, room_number, department, bed_type) VALUES (?, ?, ?, ?)",
                bed,
            )

        equip_data = [
            ("E001", "Ventilator #1", "ventilator", "Room 201", "MICU", 85),
            ("E002", "Ventilator #2", "ventilator", "Room 202", "MICU", 72),
            ("E003", "Ventilator #3", "ventilator", "Room 203", "SICU", 90),
            ("E004", "Ventilator #4", "ventilator", "Room 204", "SICU", 45),
            ("E005", "Ventilator #5", "ventilator", "Room 301", "CCU", 60),
            ("E006", "Ventilator #6", "ventilator", "Equipment Room", "ED", 95),
            ("E007", "Ventilator #7", "ventilator", "Equipment Room", "MICU", 30),
            ("E008", "Ventilator #8", "ventilator", "Equipment Room", "SICU", 55),
            ("E009", "Defibrillator #1", "defibrillator", "Nurse Station", "MICU", 80),
            ("E010", "Defibrillator #2", "defibrillator", "Nurse Station", "SICU", 70),
            ("E011", "Defibrillator #3", "defibrillator", "Room 301", "CCU", 90),
            ("E012", "Defibrillator #4", "defibrillator", "Equipment Room", "ED", 50),
            ("E013", "Defibrillator #5", "defibrillator", "Nurse Station", "CCU", 65),
            ("E014", "Defibrillator #6", "defibrillator", "Equipment Room", "MICU", 40),
            ("E015", "Infusion Pump #1", "infusion_pump", "Room 201", "MICU", 75),
            ("E016", "Infusion Pump #2", "infusion_pump", "Room 202", "MICU", 60),
            ("E017", "Infusion Pump #3", "infusion_pump", "Room 203", "SICU", 88),
            ("E018", "Infusion Pump #4", "infusion_pump", "Room 204", "SICU", 92),
            ("E019", "Infusion Pump #5", "infusion_pump", "Room 301", "CCU", 45),
            ("E020", "Infusion Pump #6", "infusion_pump", "Room 302", "STEPDOWN", 70),
            ("E021", "Infusion Pump #7", "infusion_pump", "Room 303", "STEPDOWN", 55),
            ("E022", "Infusion Pump #8", "infusion_pump", "Equipment Room", "ED", 82),
            ("E023", "Infusion Pump #9", "infusion_pump", "Equipment Room", "MICU", 35),
            ("E024", "Infusion Pump #10", "infusion_pump", "Equipment Room", "SICU", 20),
            ("E025", "Infusion Pump #11", "infusion_pump", "Nurse Station", "CCU", 67),
            ("E026", "Infusion Pump #12", "infusion_pump", "Nurse Station", "ED", 48),
            ("E027", "Wheelchair #1", "wheelchair", "Lobby", "General", 100),
            ("E028", "Wheelchair #2", "wheelchair", "Lobby", "General", 100),
            ("E029", "Wheelchair #3", "wheelchair", "Corridor A", "General", 100),
            ("E030", "Wheelchair #4", "wheelchair", "Corridor A", "General", 100),
            ("E031", "Wheelchair #5", "wheelchair", "Corridor B", "General", 100),
            ("E032", "Wheelchair #6", "wheelchair", "Corridor B", "General", 100),
            ("E033", "Wheelchair #7", "wheelchair", "Equipment Room", "General", 100),
            ("E034", "Wheelchair #8", "wheelchair", "Equipment Room", "General", 100),
            ("E035", "Ultrasound #1", "ultrasound", "Room 203", "SICU", 90),
            ("E036", "Ultrasound #2", "ultrasound", "Room 301", "CCU", 75),
            ("E037", "Ultrasound #3", "ultrasound", "Imaging", "General", 100),
            ("E038", "Ultrasound #4", "ultrasound", "Equipment Room", "ED", 60),
            ("E039", "Ultrasound #5", "ultrasound", "Equipment Room", "SICU", 40),
            ("E040", "Ultrasound #6", "ultrasound", "Imaging", "General", 85),
            ("E041", "ECG #1", "ecg", "Nurse Station", "MICU", 80),
            ("E042", "ECG #2", "ecg", "Nurse Station", "SICU", 65),
            ("E043", "ECG #3", "ecg", "Nurse Station", "CCU", 72),
            ("E044", "ECG #4", "ecg", "Equipment Room", "ED", 90),
            ("E045", "ECG #5", "ecg", "Corridor A", "General", 50),
            ("E046", "ECG #6", "ecg", "Corridor B", "General", 45),
            ("E047", "Oxygen Tank #1", "oxygen", "Room 201", "MICU", 100),
            ("E048", "Oxygen Tank #2", "oxygen", "Room 301", "CCU", 80),
            ("E049", "Oxygen Tank #3", "oxygen", "Equipment Room", "ED", 90),
            ("E050", "Oxygen Tank #4", "oxygen", "Equipment Room", "MICU", 60),
        ]
        for item in equip_data:
            await db.execute(
                "INSERT OR IGNORE INTO equipment (id, name, type, location, department, battery_level) VALUES (?, ?, ?, ?, ?, ?)",
                item,
            )

        session_count = await db.execute_fetchall("SELECT COUNT(*) AS cnt FROM sessions")
        if not session_count or session_count[0]["cnt"] == 0:
            await db.execute(
                "INSERT INTO sessions (id, active_cohort) VALUES (?, ?)",
                ("session_default", "icu_shift"),
            )
