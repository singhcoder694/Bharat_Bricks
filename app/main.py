import os
import shutil
import json
import uuid

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.schemas import AuditResult, ChatRequest, ChatResponse
from app.chains.audit import file_chain
from app.chains.companion import companion_chain
from app.utils.drive import list_folder_files, download_single_file

app = FastAPI(title="SafeSpace - LGBTQ+ Companion Platform")

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

RESPONSE_FILE = "response.json"


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
            if os.path.isdir(parent_dir) and parent_dir.startswith(os.path.join(os.environ.get("TEMP", "/tmp"), "safespace_")):
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


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Companion agent chat endpoint. Maintains per-session conversation history in memory."""
    result = companion_chain.invoke(
        {"input": req.message},
        config={"configurable": {"session_id": req.session_id}},
    )
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

            await ws.send_json({"type": "typing"})

            try:
                result = companion_chain.invoke(
                    {"input": user_message},
                    config={"configurable": {"session_id": session_id}},
                )
                await ws.send_json({"type": "response", "message": result.content})
            except Exception as e:
                await ws.send_json({"type": "error", "message": f"Agent error: {str(e)}"})

    except WebSocketDisconnect:
        print(f"Session {session_id} disconnected")


@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())
