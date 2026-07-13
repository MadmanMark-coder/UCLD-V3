import json
import logging
from fastapi import WebSocket, WebSocketDisconnect

from backend.websocket.events import (
    CHANGE_SPEED,
    SELECT_COHORT,
    ACKNOWLEDGE_ALERT,
    REPLAY_STATUS,
    COHORT_CHANGED,
)
from backend.mimic.cohort_presets import get_cohort_preset
from backend.websocket.manager import WSManager
from backend.replay.engine import ReplayEngine

logger = logging.getLogger(__name__)


async def websocket_endpoint(websocket: WebSocket, ws_manager: WSManager, engine: ReplayEngine):
    await websocket.accept()
    await ws_manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_to(websocket, "ERROR", {"message": "Invalid JSON"})
                continue

            event = msg.get("event")
            data = msg.get("data", {})

            if event == CHANGE_SPEED:
                speed = int(data.get("speed", 5))
                engine.clock.set_speed(speed)
                status = engine.get_status()
                await ws_manager.broadcast(REPLAY_STATUS, status)

            elif event == SELECT_COHORT:
                cohort_name = data.get("cohort", "")
                try:
                    stay_ids = get_cohort_preset(cohort_name)
                except KeyError as e:
                    await ws_manager.send_to(websocket, "ERROR", {"message": str(e)})
                    continue
                await engine.load_cohort(stay_ids, cohort_name)
                await ws_manager.broadcast(
                    COHORT_CHANGED,
                    {"cohort_name": cohort_name, "patient_count": len(stay_ids)},
                )

            elif event == ACKNOWLEDGE_ALERT:
                alert_id = data.get("alert_id")
                logger.info("Alert acknowledged: %s", alert_id)

            else:
                await ws_manager.send_to(
                    websocket, "ERROR", {"message": f"Unknown event: {event}"}
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s", e)
    finally:
        await ws_manager.disconnect(websocket)
