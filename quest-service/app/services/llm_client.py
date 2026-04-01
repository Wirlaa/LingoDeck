"""
LLM client — auto-detects the best available backend using FATG.

Priority (controlled by LLM_BACKEND in config):
  "auto"       → Anthropic if ANTHROPIC_API_KEY set, else FATG/Ollama
  "anthropic"  → force Claude Haiku (cloud, needs API key)
  "ollama"     → force FATG/Ollama (auto-detects hardware, picks right model)
  "none"       → disable LLM entirely

When using Ollama, FATG handles:
  - Hardware detection (M1/NVIDIA/CPU)
  - Model selection based on available RAM/VRAM
  - Auto-pulling the recommended model if not present

Deployment:
  Local/VPS → install Ollama, FATG handles the rest
  Cloud     → set ANTHROPIC_API_KEY, LLM_BACKEND=anthropic
"""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazily initialised FATG engine — created on first LLM call
_fatg_engine = None


def _should_use_anthropic() -> bool:
    if settings.LLM_BACKEND == "none":
        return False
    if settings.LLM_BACKEND == "anthropic":
        return True
    if settings.LLM_BACKEND == "ollama":
        return False
    # "auto" — prefer Anthropic if key is present
    return bool(settings.ANTHROPIC_API_KEY)


async def _get_fatg_engine():
    """
    Lazily create the FATG engine on first use.
    FATG auto-detects hardware and pulls the recommended model if needed.
    """
    global _fatg_engine
    if _fatg_engine is None:
        from fatg import FATGEngine, FATGConfig

        # Allow .env to override the model, otherwise let FATG auto-select
        config = FATGConfig(
            ollama_host=settings.OLLAMA_HOST,
            ollama_timeout=settings.OLLAMA_TIMEOUT,
            # If OLLAMA_MODEL is set in .env, use it. Otherwise FATG picks based on hardware.
            verify_model=settings.OLLAMA_MODEL if settings.OLLAMA_MODEL else None,
            enable_finnish_validation=True,
        )
        logger.info("Initialising FATG engine (hardware detection + model auto-select)...")
        _fatg_engine = await FATGEngine.create(config=config, auto_pull=True)
        logger.info(f"FATG ready: {_fatg_engine.hardware}")

    return _fatg_engine


async def generate_quest_json(prompt: str, system: str) -> dict:
    """
    Generate a quest JSON object using the configured LLM backend.
    Returns a parsed dict with sentence_fi, target_fi, distractors etc.
    """
    if settings.LLM_BACKEND == "none":
        raise RuntimeError("LLM backend is disabled (LLM_BACKEND=none)")

    if _should_use_anthropic():
        return await _call_anthropic(prompt, system)
    else:
        return await _call_fatg(prompt, system)


async def _call_anthropic(prompt: str, system: str) -> dict:
    """Call Claude Haiku via the Anthropic API."""
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    logger.debug("Using Anthropic backend for quest generation")

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
                "max_tokens": 512,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        raw = resp.json()["content"][0]["text"].strip()

    return _parse_json(raw)


async def _call_fatg(prompt: str, system: str) -> dict:
    """
    Call Ollama via FATG — which auto-detected the right model for this hardware.
    Falls back to raw Ollama if FATG is not available.
    """
    try:
        engine = await _get_fatg_engine()

        # Use FATG's backend directly with our custom prompt
        raw = await engine._backend.generate(
            model=engine.model,
            prompt=prompt,
            system=system,
            temperature=0.7,
            max_tokens=512,
            json_mode=True,
        )
        return _parse_json(raw)

    except ImportError:
        # FATG not installed — fall back to raw Ollama with whatever model is configured
        logger.warning("fatg package not found, falling back to raw Ollama call")
        return await _call_ollama_raw(prompt, system)


async def _call_ollama_raw(prompt: str, system: str) -> dict:
    """Raw Ollama fallback when fatg is not installed."""
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
                "options": {"temperature": 0.7, "num_predict": 512},
            },
        )
        resp.raise_for_status()
        return _parse_json(resp.json().get("response", ""))


def _parse_json(raw: str) -> dict:
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw[:200]}") from e
