import asyncio
import time
import logging
import httpx
from backend.database.connection import get_ucld_db

logger = logging.getLogger(__name__)

MODEL_MAP = {
    "clinical": "llama-3.1-8b-instant",
    "operations": "llama-3.1-8b-instant",
    "voice": "meta-llama/llama-4-scout-17b-16e-instruct",
}

GROQ_BASE = "https://api.groq.com/openai/v1"


class GroqClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.models = MODEL_MAP
        self._rate_limited_until: float = 0
        self._client = httpx.AsyncClient(timeout=30.0)
        logger.info("GroqClient initialised (key present: %s)", bool(api_key))

    async def chat_completion(
        self,
        model_key: str,
        messages: list,
        response_format: dict | None = None,
        stream: bool = False,
        max_tokens: int = 256,
    ) -> dict | None:
        if time.monotonic() < self._rate_limited_until:
            logger.warning("Skipping AI call for %s — rate limit cooldown active (%.0fs remaining)", model_key, self._rate_limited_until - time.monotonic())
            return None

        if not self.api_key:
            logger.warning("GroqClient not configured — skipping API call")
            return None

        model = self.models.get(model_key)
        if not model:
            logger.error("Unknown model key: %s", model_key)
            return None

        url = f"{GROQ_BASE}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "stream": stream,
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(2):
            try:
                start = time.monotonic()
                response = await self._client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                data = response.json()
                elapsed = int((time.monotonic() - start) * 1000)

                content = ""
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")

                usage = data.get("usage", {})
                await self._log_interaction(
                    model=model,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    latency_ms=elapsed,
                )
                return {"content": content}

            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                body = ""
                try:
                    body = e.response.text
                except Exception:
                    pass
                if status in (429, 503) or (status == 400 and "quota" in body.lower()):
                    logger.warning("Rate limited on model %s (attempt %d)", model_key, attempt + 1)
                    self._rate_limited_until = time.monotonic() + 60
                    if attempt == 0:
                        continue
                logger.error("Groq API error on model %s (status %s): %s", model_key, status, body[:200])
                return None

            except httpx.TimeoutException:
                logger.warning("Groq timeout on model %s (attempt %d)", model_key, attempt + 1)
                if attempt == 0:
                    continue
                return None

            except Exception as e:
                logger.error("Groq unexpected error on model %s: %s: %s", model_key, type(e).__name__, e)
                self._rate_limited_until = time.monotonic() + 10
                return None

        logger.warning("Max retries exhausted for model %s", model_key)
        return None

    async def clinical_complete(self, messages: list, stream: bool = False) -> dict | None:
        return await self.chat_completion("clinical", messages, stream=stream, max_tokens=512)

    async def operations_complete(self, messages: list) -> dict | None:
        return await self.chat_completion("operations", messages, max_tokens=256)

    async def voice_complete(self, messages: list, stream: bool = False) -> dict | None:
        return await self.chat_completion("voice", messages, stream=stream, max_tokens=256)

    async def _log_interaction(self, model: str, prompt_tokens: int, completion_tokens: int, latency_ms: int):
        try:
            async with get_ucld_db() as db:
                import uuid
                await db.execute(
                    """INSERT INTO ai_interactions (id, session_id, model_used, prompt_tokens, completion_tokens, latency_ms)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), "system", model, prompt_tokens, completion_tokens, latency_ms),
                )
        except Exception as e:
            logger.warning("Failed to log AI interaction: %s", e)
