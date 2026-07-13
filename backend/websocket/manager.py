import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WSManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        self.active_connections.add(websocket)
        logger.info("WebSocket connected (%d total)", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info("WebSocket disconnected (%d remaining)", len(self.active_connections))

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"event": event_type, "data": data})
        dead = set()
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active_connections.discard(ws)

    async def send_to(self, websocket: WebSocket, event_type: str, data: dict):
        try:
            await websocket.send_text(json.dumps({"event": event_type, "data": data}))
        except Exception:
            await self.disconnect(websocket)
