"""
LLM client for challenge-service (KELA boss question generation).

Same auto-detection logic as quest-service — FATG handles hardware
detection and model selection when using Ollama.

See quest-service/llm_client.py for full documentation.
"""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_fatg_engine = None


def _should_use_anthropic() -> bool:
    if settings.LLM_BACKEND == "none":
        return False
    if settings.LLM_BACKEND == "anthropic":
        return True
    if settings.LLM_BACKEND == "ollama":
        return False
    return bool(settings.ANTHROPIC_API_KEY)


async def _get_fatg_engine():
    """Lazily create FATG engine — auto-detects hardware, pulls model if needed."""
    global _fatg_engine
    if _fatg_engine is None:
        from fatg import FATGEngine, FATGConfig

        config = FATGConfig(
            ollama_host=settings.OLLAMA_HOST,
            ollama_timeout=settings.OLLAMA_TIMEOUT,
            verify_model=settings.OLLAMA_MODEL if settings.OLLAMA_MODEL else None,
            max_tokens=4096,  # KELA needs more tokens — generates one question per card
        )
        logger.info("Initialising FATG engine for KELA boss...")
        _fatg_engine = await FATGEngine.create(config=config, auto_pull=True)
        logger.info(f"FATG ready: {_fatg_engine.hardware}")

    return _fatg_engine


async def generate_kela_json(prompt: str, system: str) -> dict:
    """Generate KELA boss questions using the configured LLM backend."""
    if settings.LLM_BACKEND == "none":
        raise RuntimeError("LLM backend is disabled")

    if _should_use_anthropic():
        return await _call_anthropic(prompt, system)
    return await _call_fatg(prompt, system)


async def _call_anthropic(prompt: str, system: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5",
                "max_tokens": 4096,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        raw = resp.json()["content"][0]["text"].strip()

    return _parse(raw)


async def _call_fatg(prompt: str, system: str) -> dict:
    """Call Ollama via FATG with auto-detected hardware and model."""
    try:
        engine = await _get_fatg_engine()
        raw = await engine._backend.generate(
            model=engine.model,
            prompt=prompt,
            system=system,
            temperature=0.7,
            max_tokens=4096,
            json_mode=True,
        )
        return _parse(raw)

    except ImportError:
        logger.warning("fatg package not found, falling back to raw Ollama")
        return await _call_ollama_raw(prompt, system)


async def _call_ollama_raw(prompt: str, system: str) -> dict:
    model = settings.OLLAMA_MODEL or "qwen2.5:1.5b"
    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
        resp = await client.post(
            f"{settings.OLLAMA_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "system": system,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.7, "num_predict": 4096},
            },
        )
        resp.raise_for_status()
        return _parse(resp.json().get("response", ""))


def _parse(raw: str) -> dict:
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from LLM: {e}") from e
