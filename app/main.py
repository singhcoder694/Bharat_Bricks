import base64
import json
import logging
import os
import shutil
import time
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from schemas import AuditResult, ChatRequest, ChatResponse, TranscribeResponse, TtsRequest, TtsResponse, TtsSegment
from config import CORS_ORIGINS
from utils.sarvam_transcribe import transcribe_audio_bytes
from utils.sarvam_tts import synthesize_speech_mp3_segments
from chains.audit import file_chain
from chains.companion import companion_chain
from utils.drive import list_folder_files, download_single_file

logger = logging.getLogger(__name__)

app = FastAPI(title="Tritiya - LGBTQ+ Companion Platform")

if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")

RESPONSE_FILE = "response.json"

_TTS_CACHE_TTL_S = 60 * 60  # 1 hour
_TTS_CACHE_MAX = 256
_tts_cache: dict[str, tuple[float, TtsResponse]] = {}


def _tts_cache_key(req: TtsRequest) -> str:
    # Key includes all user-controlled inputs; model/speaker/pace are server config.
    return f"{req.target_language_code.strip()}|{req.text.strip()}"


def _tts_cache_get(key: str) -> TtsResponse | None:
    now = time.time()
    hit = _tts_cache.get(key)
    if not hit:
        return None
    ts, val = hit
    if now - ts > _TTS_CACHE_TTL_S:
        _tts_cache.pop(key, None)
        return None
    return val


def _tts_cache_set(key: str, val: TtsResponse) -> None:
    # Simple size cap: drop oldest entry.
    if len(_tts_cache) >= _TTS_CACHE_MAX:
        oldest_key = min(_tts_cache.items(), key=lambda kv: kv[1][0])[0]
        _tts_cache.pop(oldest_key, None)
    _tts_cache[key] = (time.time(), val)


def _load_existing_results() -> list[dict]:
    if os.path.exists(RESPONSE_FILE):
        with open(RESPONSE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_results(all_results: list[dict]):
    with open(RESPONSE_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=4)


def _process_files(file_list: list[dict], existing_results: list[dict]) -> list[dict]:
    """Process a list of Drive files, appending to existing_results incrementally."""
    all_results = list(existing_results)
    total = len(file_list)

    for i, file_info in enumerate(file_list, 1):
        filename = file_info["name"]
        file_id = file_info["id"]
        print(f"[{i}/{total}] Downloading: {filename}")

        try:
            file_path = download_single_file(file_id, filename)
            print(f"[{i}/{total}] Auditing: {filename}")
            result = file_chain.invoke(file_path)
            all_results.append(result.model_dump() if hasattr(result, "model_dump") else result.dict())
            print(f"[{i}/{total}] Done: is_relevant={result.is_relevant}, score={result.relevance_score}")

            parent_dir = os.path.dirname(file_path)
            if os.path.isdir(parent_dir) and parent_dir.startswith(os.path.join(os.environ.get("TEMP", "/tmp"), "tritiya_")):
                shutil.rmtree(parent_dir, ignore_errors=True)

        except Exception as e:
            print(f"[{i}/{total}] ERROR on {filename}: {e}")
            all_results.append(AuditResult(
                filename=filename,
                is_relevant=False,
                relevance_score=0.0,
                relevant_text="",
            ).model_dump())

        _save_results(all_results)

    return all_results


@app.post("/ingest", response_model=list[AuditResult])
def ingest_knowledge_base():
    """Full ingest: process ALL .md files from Drive (starts fresh)."""
    print("Listing files in Google Drive folder...")
    file_list = list_folder_files()
    if not file_list:
        raise HTTPException(status_code=404, detail="No .md files found in the Drive folder")

    print(f"Found {len(file_list)} .md files. Processing one by one...\n")
    all_results = _process_files(file_list, [])
    return [AuditResult(**r) for r in all_results]


@app.post("/ingest/resume", response_model=list[AuditResult])
def resume_ingestion():
    """Resume ingest: skip files already in response.json, process only missing ones."""
    print("Loading existing results from response.json...")
    existing_results = _load_existing_results()
    done_filenames = {r["filename"] for r in existing_results}
    print(f"Already processed: {len(done_filenames)} files")

    print("Listing files in Google Drive folder...")
    file_list = list_folder_files()
    if not file_list:
        raise HTTPException(status_code=404, detail="No .md files found in the Drive folder")

    remaining = [f for f in file_list if f["name"] not in done_filenames]
    if not remaining:
        print("All files already processed!")
        return [AuditResult(**r) for r in existing_results]

    print(f"Found {len(file_list)} total .md files, {len(remaining)} remaining to process.\n")
    all_results = _process_files(remaining, existing_results)
    return [AuditResult(**r) for r in all_results]


@app.post("/tts", response_model=TtsResponse)
async def text_to_speech(req: TtsRequest):
    """Natural TTS via Sarvam Bulbul (Indian accents). Returns one or more MP3 segments."""
    key = _tts_cache_key(req)
    cached = _tts_cache_get(key)
    if cached is not None:
        return cached

    try:
        segments_bytes = await synthesize_speech_mp3_segments(req.text, req.target_language_code.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("TTS failed")
        raise HTTPException(status_code=500, detail=f"TTS failed: {e!s}") from e

    if not segments_bytes:
        raise HTTPException(status_code=400, detail="Empty text after processing")

    resp = TtsResponse(
        segments=[
            TtsSegment(mime="audio/mpeg", data=base64.b64encode(b).decode("ascii"))
            for b in segments_bytes
        ],
    )
    _tts_cache_set(key, resp)
    return resp


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    """Speech-to-text via Sarvam AI (see integrations/voice_transcription)."""
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
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e!s}") from e

    if not result["text"]:
        raise HTTPException(status_code=422, detail="No speech detected in the recording")

    return TranscribeResponse(
        text=result["text"],
        language=result.get("language"),
        language_probability=result.get("language_probability"),
    )


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Companion agent chat endpoint. Maintains per-session conversation history in memory."""
    payload: dict = {"input": req.message}
    if req.language_code:
        payload["language_code"] = req.language_code
    print(f"\n[USER] {req.message}")
    result = companion_chain.invoke(
        payload,
        config={"configurable": {"session_id": req.session_id}},
    )
    print(f"[LLM] {result.content}\n")
    return ChatResponse(session_id=req.session_id, response=result.content)


@app.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):
    """WebSocket endpoint for persistent companion chat connections."""
    await ws.accept()
    session_id = str(uuid.uuid4())
    await ws.send_json({"type": "session", "session_id": session_id})

    try:
        while True:
            data = await ws.receive_json()
            user_message = data.get("message", "").strip()
            if not user_message:
                await ws.send_json({"type": "error", "message": "Empty message"})
                continue

            language_code = data.get("language_code") or data.get("language")

            await ws.send_json({"type": "typing"})

            try:
                print(f"\n[USER] {user_message}")
                payload: dict = {"input": user_message}
                if language_code:
                    payload["language_code"] = str(language_code).strip()
                result = companion_chain.invoke(
                    payload,
                    config={"configurable": {"session_id": session_id}},
                )
                print(f"[LLM] {result.content}\n")
                await ws.send_json({"type": "response", "message": result.content})
            except Exception as e:
                await ws.send_json({"type": "error", "message": f"Agent error: {str(e)}"})

    except WebSocketDisconnect:
        print(f"Session {session_id} disconnected")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if not os.path.exists(index_path):
        return HTMLResponse(content="<h1>Tritiya API is running</h1><p>Use /health, /chat, /tts, /transcribe</p>")
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())
