"""Text-to-speech via Sarvam AI (Indian languages + en-IN)."""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.config import (
    SARVAM_API_BASE,
    SARVAM_API_KEY,
    SARVAM_TTS_MODEL,
    SARVAM_TTS_PACE,
    SARVAM_TTS_SPEAKER,
)

logger = logging.getLogger(__name__)

TTS_PATH = "/text-to-speech"


def _tts_url() -> str:
    return f"{SARVAM_API_BASE.rstrip('/')}{TTS_PATH}"


def _sarvam_error_detail(response: httpx.Response) -> str:
    try:
        body: Any = response.json()
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict) and err.get("message"):
                return str(err["message"])
            return str(body.get("message") or body.get("error") or body.get("detail") or body)
    except Exception:
        pass
    return (response.text or response.reason_phrase or "Sarvam API error")[:800]


def chunk_text_for_tts(text: str, max_len: int = 2400) -> list[str]:
    """Split long text under Sarvam bulbul:v3 per-request limits."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_len:
        return [text]
    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_len, n)
        if end < n:
            window = text[start:end]
            break_at = max(window.rfind("\n\n"), window.rfind(". "), window.rfind(" "), window.rfind("\n"))
            if break_at >= max_len // 5:
                end = start + break_at + 1
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end
    return chunks


async def synthesize_one_segment(
    text: str,
    target_language_code: str,
) -> bytes:
    """Call Sarvam TTS for one segment; returns MP3 bytes."""
    if not SARVAM_API_KEY:
        raise RuntimeError(
            "SARVAM_API_KEY is not set. Get a key from https://docs.sarvam.ai and add it to your .env",
        )
    if not text.strip():
        raise ValueError("empty text")

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "text": text,
        "target_language_code": target_language_code,
        "model": SARVAM_TTS_MODEL,
        "speaker": SARVAM_TTS_SPEAKER,
        "output_audio_codec": "mp3",
        "pace": SARVAM_TTS_PACE,
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
        response = await client.post(_tts_url(), headers=headers, json=body)

    if response.status_code >= 400:
        raise RuntimeError(f"Sarvam TTS HTTP {response.status_code}: {_sarvam_error_detail(response)}")

    payload = response.json()
    if not isinstance(payload, dict):
        raise RuntimeError("Sarvam TTS returned invalid JSON")
    audios = payload.get("audios") or []
    if not audios or not isinstance(audios[0], str):
        raise RuntimeError("Sarvam TTS returned no audio")

    return base64.b64decode(audios[0])


async def synthesize_speech_mp3_segments(text: str, target_language_code: str) -> list[bytes]:
    """Full message: one or more MP3 byte strings (same codec)."""
    parts = chunk_text_for_tts(text)
    if not parts:
        return []
    out: list[bytes] = []
    for i, chunk in enumerate(parts, 1):
        logger.info(
            "Sarvam TTS segment %s/%s chars=%s lang=%s",
            i,
            len(parts),
            len(chunk),
            target_language_code,
        )
        out.append(await synthesize_one_segment(chunk, target_language_code))
    return out
