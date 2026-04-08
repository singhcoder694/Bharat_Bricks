"""
Portable Sarvam AI speech-to-text for FastAPI (Indian languages + English).

Copy this file into any project — no Bharat_Bricks imports.

    pip install httpx python-multipart

    export SARVAM_API_KEY=...   # or SARVAM_SUBSCRIPTION_KEY

    from voice_api import create_voice_router
    app.include_router(create_voice_router())

API docs: https://docs.sarvam.ai/api-reference-docs/speech-to-text
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY") or os.environ.get("SARVAM_SUBSCRIPTION_KEY")
SARVAM_API_BASE = os.environ.get("SARVAM_API_BASE", "https://api.sarvam.ai").rstrip("/")
SARVAM_STT_MODEL = os.environ.get("SARVAM_STT_MODEL", "saarika:v2.5")
SARVAM_LANGUAGE_CODE = os.environ.get("SARVAM_LANGUAGE_CODE", "unknown")
SARVAM_STT_MODE = os.environ.get("SARVAM_STT_MODE", "transcribe")


class TranscribeResponse(BaseModel):
    text: str = Field(description="Transcribed speech")
    language: str | None = Field(default=None, description="Detected BCP-47 language code")
    language_probability: float | None = None


def _stt_url() -> str:
    return f"{SARVAM_API_BASE}/speech-to-text"


def _sarvam_error_detail(response: httpx.Response) -> str:
    try:
        body: Any = response.json()
        if isinstance(body, dict):
            return str(body.get("message") or body.get("error") or body.get("detail") or body)
    except Exception:
        pass
    return (response.text or response.reason_phrase or "Sarvam API error")[:800]


async def transcribe_audio_bytes(file_bytes: bytes, filename: str = "speech.webm") -> dict:
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY (or SARVAM_SUBSCRIPTION_KEY) is not set")
    if not file_bytes:
        raise ValueError("empty audio")

    headers = {"api-subscription-key": SARVAM_API_KEY}
    files = {"file": (filename, file_bytes, "application/octet-stream")}
    data: dict[str, str] = {"model": SARVAM_STT_MODEL, "language_code": SARVAM_LANGUAGE_CODE}
    if SARVAM_STT_MODEL == "saaras:v3":
        data["mode"] = SARVAM_STT_MODE

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
        response = await client.post(_stt_url(), headers=headers, files=files, data=data)

    if response.status_code >= 400:
        raise RuntimeError(f"Sarvam STT HTTP {response.status_code}: {_sarvam_error_detail(response)}")

    payload = response.json()
    transcript = (payload.get("transcript") or "").strip()
    lang = payload.get("language_code")
    return {"text": transcript, "language": lang if lang else None, "language_probability": None}


def create_voice_router(*, prefix: str = "", tags: list[str] | None = None) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags or ["voice"])

    @router.post("/transcribe", response_model=TranscribeResponse)
    async def transcribe(file: UploadFile = File(...)):
        try:
            body = await file.read()
            if not body:
                raise HTTPException(status_code=400, detail="Empty audio upload")
            result = await transcribe_audio_bytes(body, file.filename or "speech.webm")
        except HTTPException:
            raise
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        except Exception as e:
            logger.exception("transcribe failed")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {e!s}") from e

        if not result.get("text"):
            raise HTTPException(status_code=422, detail="No speech detected in the recording")

        return TranscribeResponse(
            text=result["text"],
            language=result.get("language"),
            language_probability=result.get("language_probability"),
        )

    return router
