from typing import Optional
from backend.replay.engine import ReplayEngine
from backend.websocket.manager import WSManager
from backend.services.groq_client import GroqClient
from backend.services.clinical_engine import ClinicalEngine
from backend.services.operations_copilot import OperationsCopilot
from backend.services.voice_assistant import VoiceAssistant
from backend.services.emergency_coordinator import EmergencyCoordinator

engine: Optional[ReplayEngine] = None
ws_manager: Optional[WSManager] = None
groq_client: Optional[GroqClient] = None
clinical_engine: Optional[ClinicalEngine] = None
operations_copilot: Optional[OperationsCopilot] = None
voice_assistant: Optional[VoiceAssistant] = None
emergency_coordinator: Optional[EmergencyCoordinator] = None
