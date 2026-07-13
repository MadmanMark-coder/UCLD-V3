import asyncio
import time
import logging
import httpx
from backend.database.connection import get_ucld_db

logger = logging.getLogger(__name__)

MODEL_MAP = {
    "clinical": "meta-llama/llama-3.1-8b-instruct",
    "operations": "meta-llama/llama-3.1-8b-instruct",
    "voice": "meta-llama/llama-4-scout-17b-16e-instruct",
}

AI_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class GroqClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.models = MODEL_MAP
        self._rate_limited_until: float = 0
        logger.info("AIClient initialised via OpenRouter (key present: %s)", bool(api_key))

    async def chat_completion(
        self,
        model_key: str,
        messages: list,
        response_format: dict | None = None,
        stream: bool = False,
        max_tokens: int = 256,
    ) -> dict | None:
        if time.monotonic() < self._rate_limited_until:
            logger.warning("Skipping AI call for model %s — rate limit cooldown active (%.0fs remaining)", model_key, self._rate_limited_until - time.monotonic())
            return None

        if not self.api_key:
            logger.warning("AIClient not configured — skipping API call")
            return None

        model = self.models.get(model_key)
        if not model:
            logger.error("Unknown model key: %s", model_key)
            return None

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(2):
            try:
                start = time.monotonic()
                response = await asyncio.to_thread(
                    self._post_sync,
                    payload,
                )
                elapsed = int((time.monotonic() - start) * 1000)

                if stream:
                    return response

                data = response.json()
                choices = data.get("choices", [])
                content = choices[0]["message"]["content"] if choices else ""
                usage = data.get("usage", {})
                await self._log_interaction(
                    model=model,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    latency_ms=elapsed,
                )
                return {"content": content, "usage": usage}

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    logger.warning("Rate limited on model %s (attempt %d)", model_key, attempt + 1)
                    self._rate_limited_until = time.monotonic() + 30
                    continue
                logger.error("AI API error on model %s: %s", model_key, e)
                return None

            except Exception as e:
                logger.error("AI unexpected error on model %s: %s: %s", model_key, type(e).__name__, e)
                self._rate_limited_until = time.monotonic() + 10
                return None

        logger.warning("Max retries exhausted for model %s", model_key)
        return None

    def _post_sync(self, payload: dict) -> httpx.Response:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                AI_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5175",
                    "X-Title": "UCLD V3",
                },
            )
            response.raise_for_status()
            return response

    async def clinical_complete(self, messages: list, stream: bool = False) -> dict | None:
        return await self.chat_completion("clinical", messages, stream=stream)

    async def operations_complete(self, messages: list) -> dict | None:
        return await self.chat_completion("operations", messages)

    async def voice_complete(self, messages: list, stream: bool = False) -> dict | None:
        result = await self.chat_completion("voice", messages, stream=stream)
        if result is None:
            return None
        if stream:
            return self._consume_stream(result)
        return result

    async def _consume_stream(self, stream_response) -> dict:
        content_parts = []
        start = time.monotonic()
        for chunk in stream_response:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                content_parts.append(delta.content)
        elapsed = int((time.monotonic() - start) * 1000)
        content = "".join(content_parts)
        await self._log_interaction(
            model=self.models["voice"],
            prompt_tokens=0,
            completion_tokens=0,
            latency_ms=elapsed,
        )
        return {"content": content}

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
