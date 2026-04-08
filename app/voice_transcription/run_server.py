"""Standalone runner for the voice transcription API."""

import os
import sys
from pathlib import Path

_this_dir = Path(__file__).resolve().parent
_project_root = _this_dir.parent.parent

if str(_this_dir) not in sys.path:
    sys.path.insert(0, str(_this_dir))

from dotenv import load_dotenv

load_dotenv(_this_dir / ".env")
load_dotenv(_project_root / ".env")

from voice_api import create_voice_router  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app = FastAPI(title="Voice Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(create_voice_router())


@app.get("/")
def health():
    return {"status": "ok", "service": "voice-transcription"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("VOICE_API_PORT", "8000"))
    uvicorn.run("run_server:app", host="0.0.0.0", port=port, reload=True)
