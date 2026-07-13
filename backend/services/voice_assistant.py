import json
import logging
import re
import uuid

logger = logging.getLogger(__name__)

MAX_SESSION_MEMORY = 5


class VoiceAssistant:
    def __init__(self, groq_client, engine):
        self.groq = groq_client
        self.engine = engine
        self._sessions: dict[str, list[dict]] = {}

    async def handle_command(self, text: str, session_id: str) -> dict:
        intent = await self._classify_intent(text)
        memory = self._sessions.get(session_id, [])
        memory.append({"role": "user", "content": text})
        if len(memory) > MAX_SESSION_MEMORY:
            memory = memory[-MAX_SESSION_MEMORY:]
        self._sessions[session_id] = memory

        handler_map = {
            "summarize_patient": self._handle_summarize_patient,
            "show_view": self._handle_show_view,
            "find_equipment": self._handle_find_equipment,
            "find_bed": self._handle_find_bed,
            "generate_report": self._handle_generate_report,
            "general_question": self._handle_general_question,
        }
        handler = handler_map.get(intent, self._handle_general_question)
        response = await handler(text)

        memory.append({"role": "assistant", "content": response})
        self._sessions[session_id] = memory

        return {"intent": intent, "response": response, "session_id": session_id}

    async def _classify_intent(self, text: str) -> str:
        result = await self.groq.voice_complete([{"role": "user", "content": (
            f"Classify the following voice command into one of these intents:\n"
            f'- "summarize_patient" — request to summarise a specific patient (e.g., "summarize patient 205", "tell me about patient 200001")\n'
            f'- "show_view" — request to navigate to a view (e.g., "show me the bed board", "open alerts", "go to emergency")\n'
            f'- "find_equipment" — request to find equipment (e.g., "find a ventilator", "where is a defib")\n'
            f'- "find_bed" — request to find an available bed (e.g., "find an ICU bed", "available beds in MICU")\n'
            f'- "generate_report" — request to generate a report (e.g., "generate ICU handover", "occupancy report")\n'
            f'- "general_question" — anything else\n\n'
            f'Command: "{text}"\n\nReturn ONLY the intent name, nothing else.'
        )}])
        if result and result.get("content"):
            intent = result["content"].strip().strip('"').strip("'")
            valid = {"summarize_patient", "show_view", "find_equipment", "find_bed", "generate_report", "general_question"}
            if intent in valid:
                return intent
        return self._rule_intent(text)

    def _rule_intent(self, text: str) -> str:
        t = text.lower()
        if re.search(r'(?:summarize|tell me about|overview of|status of)\s+(?:patient|stay)\s*#?\s*\d+', t):
            return "summarize_patient"
        if re.search(r'(?:find|available|free|empty|need|looking for)\s+(?:a\s+|an\s+)?(?:\w+\s+)?bed', t) or "bed in" in t or "beds in" in t:
            return "find_bed"
        if any(w in t for w in ("show", "open", "navigate", "go to", "take me to", "switch to", "display")):
            return "show_view"
        if any(w in t for w in ("find", "where is", "locate", "search for")) and any(w in t for w in ("ventilator", "defib", "defibrillator", "equipment", "wheelchair", "pump", "monitor", "ultrasound", "ecg", "oxygen")):
            return "find_equipment"
        if any(w in t for w in ("generate", "report", "handover")):
            return "generate_report"
        return "general_question"

    def _extract_patient_id(self, text: str) -> str | None:
        match = re.search(r'(?:patient|stay)\s*#?\s*(\d{3,})', text, re.IGNORECASE)
        if match:
            return match.group(1)
        match = re.search(r'(\d{5,})', text)
        if match:
            return match.group(1)
        return None

    def _extract_view_name(self, text: str) -> str:
        text_lower = text.lower()
        if "bed" in text_lower:
            return "beds"
        if "alert" in text_lower:
            return "alerts"
        if "emergency" in text_lower:
            return "emergency"
        if "equipment" in text_lower or "equip" in text_lower:
            return "equipment"
        if "patient" in text_lower:
            return "patients"
        return "dashboard"

    def _extract_equipment_type(self, text: str) -> str:
        text_lower = text.lower()
        mapping = {
            "ventilator": "ventilator",
            "defibrillator": "defibrillator",
            "defib": "defibrillator",
            "infusion pump": "infusion_pump",
            "wheelchair": "wheelchair",
            "ultrasound": "ultrasound",
            "ecg": "ecg",
            "oxygen": "oxygen",
        }
        for keyword, equip_type in mapping.items():
            if keyword in text_lower:
                return equip_type
        return ""

    async def _handle_summarize_patient(self, text: str) -> str:
        from backend import state as app_state
        patient_id = self._extract_patient_id(text)
        if not patient_id:
            return "Which patient would you like me to summarize? Please provide a patient ID."
        clin = app_state.clinical_engine
        if not clin:
            return "Clinical engine is not available."
        summary = await clin.generate_patient_summary(patient_id)
        return summary.get("one_liner", f"Patient {patient_id}: {summary.get('summary', 'No summary available.')}")

    async def _handle_show_view(self, text: str) -> str:
        view = self._extract_view_name(text)
        return f"Navigating to {view} view."

    async def _handle_find_equipment(self, text: str) -> str:
        from backend.services.equipment_tracker import get_all_equipment
        equip_type = self._extract_equipment_type(text)
        if not equip_type:
            items = await get_all_equipment()
            available = [e for e in items if e.get("status") == "available"]
            if available:
                return f"There are {len(available)} available equipment items. What specific type are you looking for? (Ventilator, Defibrillator, Infusion Pump, etc.)"
            return "No available equipment at this time."
        items = await get_all_equipment(equip_type=equip_type, status="available")
        if items:
            locs = set(e.get("location", "Unknown") for e in items)
            return f"Found {len(items)} available {equip_type}s at: {', '.join(sorted(locs))}."
        return f"No available {equip_type}s found."

    async def _handle_find_bed(self, text: str) -> str:
        from backend.services.operations_copilot import OperationsCopilot
        copilot = OperationsCopilot(self.groq, self.engine)
        from backend.services.bed_manager import get_all_beds
        beds = await get_all_beds()
        available = [b for b in beds if b.get("status") == "available"]
        if not available:
            return "I'm sorry, no beds are currently available."
        rec = await copilot.recommend_bed_placement(text, available)
        if rec.get("recommended_bed_id"):
            return f"I recommend {rec.get('recommended_bed_id')}: {rec.get('reason', '')}."
        return f"There are {len(available)} available beds."

    async def _handle_generate_report(self, text: str) -> str:
        from backend.services.operations_copilot import OperationsCopilot
        copilot = OperationsCopilot(self.groq, self.engine)
        report_type = "icu_handover"
        if "occupancy" in text.lower():
            report_type = "occupancy"
        elif "equipment" in text.lower():
            report_type = "equipment_status"
        return await copilot.generate_report(report_type)

    async def _handle_general_question(self, text: str) -> str:
        from backend.services.operations_copilot import OperationsCopilot
        copilot = OperationsCopilot(self.groq, self.engine)
        return await copilot.answer_query(text)
