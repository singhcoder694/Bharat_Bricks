"""Speech-to-text via Sarvam AI (Indian languages + English)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from config import (
    SARVAM_API_BASE,
    SARVAM_API_KEY,
    SARVAM_LANGUAGE_CODE,
    SARVAM_STT_MODEL,
    SARVAM_STT_MODE,
)

logger = logging.getLogger(__name__)

SARVAM_STT_PATH = "/speech-to-text"


def _stt_url() -> str:
    return f"{SARVAM_API_BASE.rstrip('/')}{SARVAM_STT_PATH}"


def _sarvam_error_detail(response: httpx.Response) -> str:
    try:
        body: Any = response.json()
        if isinstance(body, dict):
            return str(body.get("message") or body.get("error") or body.get("detail") or body)
    except Exception:
        pass
    return (response.text or response.reason_phrase or "Sarvam API error")[:800]


async def transcribe_audio_bytes(file_bytes: bytes, filename: str = "speech.webm") -> dict:
    """
    Call Sarvam speech-to-text. Returns dict: text, language (BCP-47 or None), language_probability (None).
    """
    if not SARVAM_API_KEY:
        raise RuntimeError(
            "SARVAM_API_KEY is not set. Get a key from https://docs.sarvam.ai and add it to your .env",
        )
    if not file_bytes:
        raise ValueError("empty audio")

    headers = {"api-subscription-key": SARVAM_API_KEY}
    lower = (filename or "").lower()
    if lower.endswith(".webm"):
        file_mime = "audio/webm"
    elif lower.endswith((".mp4", ".m4a")):
        file_mime = "audio/mp4"
    elif lower.endswith(".ogg"):
        file_mime = "audio/ogg"
    elif lower.endswith(".wav"):
        file_mime = "audio/wav"
    elif lower.endswith(".caf"):
        file_mime = "audio/x-caf"
    elif lower.endswith(".3gp"):
        file_mime = "audio/3gpp"
    elif lower.endswith(".aac"):
        file_mime = "audio/aac"
    else:
        file_mime = "application/octet-stream"

    files = {"file": (filename, file_bytes, file_mime)}
    data: dict[str, str] = {
        "model": SARVAM_STT_MODEL,
        "language_code": SARVAM_LANGUAGE_CODE,
    }
    if SARVAM_STT_MODEL == "saaras:v3":
        data["mode"] = SARVAM_STT_MODE

    logger.info(
        "Sarvam STT: bytes=%s file=%s model=%s language_code=%s mime=%s",
        len(file_bytes),
        filename,
        SARVAM_STT_MODEL,
        SARVAM_LANGUAGE_CODE,
        file_mime,
    )

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
        response = await client.post(_stt_url(), headers=headers, files=files, data=data)

    if response.status_code >= 400:
        raise RuntimeError(f"Sarvam STT HTTP {response.status_code}: {_sarvam_error_detail(response)}")

    payload = response.json()
    if not isinstance(payload, dict):
        payload = {}
    transcript = (
        (payload.get("transcript") or payload.get("text") or "") or ""
    )
    if isinstance(transcript, str):
        transcript = transcript.strip()
    else:
        transcript = str(transcript).strip()
    lang = payload.get("language_code")
    if not transcript:
        logger.warning(
            "Sarvam returned empty transcript. Response keys: %s",
            list(payload.keys()) if isinstance(payload, dict) else type(payload),
        )
    return {
        "text": transcript,
        "language": lang if lang else None,
        "language_probability": payload.get("language_probability"),
    }
