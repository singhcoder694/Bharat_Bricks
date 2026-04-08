# Sarvam AI voice transcription (portable)

Browser microphone → **POST** `multipart/form-data` field **`file`** → JSON `{ "text", "language", ... }` using [Sarvam speech-to-text](https://docs.sarvam.ai/api-reference-docs/speech-to-text) (Indian languages + English, auto language detection when `language_code=unknown`).

## Setup

1. Create an API key in the [Sarvam AI console](https://docs.sarvam.ai) (header: `api-subscription-key`).

2. Python: `pip install httpx python-multipart fastapi`

3. Environment:

| Variable | Default | Notes |
|----------|---------|--------|
| `SARVAM_API_KEY` or `SARVAM_SUBSCRIPTION_KEY` | — | Required |
| `SARVAM_API_BASE` | `https://api.sarvam.ai` | Usually unchanged |
| `SARVAM_STT_MODEL` | `saarika:v2.5` | Or `saaras:v3` for more languages |
| `SARVAM_LANGUAGE_CODE` | `unknown` | Auto-detect; or e.g. `hi-IN` |
| `SARVAM_STT_MODE` | `transcribe` | Only for `saaras:v3`: transcribe, translate, etc. |

4. Copy **`voice_api.py`** next to your app and mount:

```python
from fastapi import FastAPI
from voice_api import create_voice_router

app = FastAPI()
app.include_router(create_voice_router())
# Optional: app.include_router(create_voice_router(prefix="/api"))  → /api/transcribe
```

No `ffmpeg` is required — Sarvam accepts WebM and other browser formats.

**Note:** REST STT is aimed at interactive clips (roughly under **30 seconds**). Longer audio → Sarvam batch API (separate docs).

## Frontend on another domain

- Same origin: POST to `/transcribe` (see **`client_snippet.js`**).
- Cross-origin: enable **CORS** on FastAPI and set the full API URL in the client.

## Reply in the same language (LLM)

After transcription, pass `language` from the JSON response to your chat layer (e.g. WebSocket `{ "message": "...", "language_code": "hi-IN" }`) and add a short system instruction: “Reply in the user’s language.” The main SafeSpace app does this automatically for voice turns.

## Bharat_Bricks — React `web-client`

The Vite app in **`web-client/`** uses the same STT contract via **`web-client/src/lib/speechToText.ts`** (TypeScript port of `client_snippet.js`).

1. API: set **`SARVAM_API_KEY`** (and optional Sarvam vars) in the FastAPI `.env`, run Uvicorn on port **8000**.
2. CORS: backend **`CORS_ORIGINS`** defaults include `http://localhost:5173` and `http://127.0.0.1:5173` (Vite). Override with a comma-separated env list if needed.
3. Web client: copy **`web-client/.env.example`** to **`web-client/.env`** and set **`VITE_API_URL=http://127.0.0.1:8000`**, then `npm run dev`. The mic appears next to send; tap to record, tap again to transcribe and send.

---

Production code lives in `app/utils/sarvam_transcribe.py` and `POST /transcribe`; **`voice_api.py`** here is for copy-paste into other codebases.
