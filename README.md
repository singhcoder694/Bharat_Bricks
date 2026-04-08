# SafeSpace - LGBTQ+ AI Companion Platform

SafeSpace is an AI platform built for the Bharat Bricks hackathon (Databricks) that provides a private, empathetic AI companion for people exploring their gender identity and sexuality. The platform comprises two core AI agents: an **Auditing Agent** for knowledge base curation and a **Companion Agent** for user-facing conversations.

All LLM inference is powered by the **Databricks AI Gateway**, and the entire application is built on **LangChain Expression Language (LCEL)** with **FastAPI** serving both REST and WebSocket endpoints.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Agent 1: Auditing Agent](#agent-1-auditing-agent)
- [Agent 2: Companion Agent](#agent-2-companion-agent)
- [API Endpoints](#api-endpoints)
- [Frontend](#frontend)
- [Configuration](#configuration)
- [LangChain Features Used](#langchain-features-used)
- [How to Run](#how-to-run)
- [Resilient Resume Script](#resilient-resume-script)
- [Output Files](#output-files)
- [Future Work](#future-work)

---

## Architecture Overview

```
                          Databricks AI Gateway
                         ┌──────────────────────┐
                         │  LLMs (Llama, Gemma,  │
                         │  Qwen, GPT-OSS, etc.) │
                         │  Embedding Models      │
                         └──────────┬─────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              Audit Agent    Companion Agent    Embeddings
              (Admin only)   (User-facing)     (RAG pipeline)
                    │               │
                    │         ┌─────┴──────┐
                    │         │  WebSocket  │
                    │         │  + REST API │
                    │         └─────┬──────┘
                    │               │
              FastAPI Server ───────┘
                    │
              ┌─────┴──────┐
              │  Frontend   │
              │  Chat UI    │
              └────────────┘
```

---

## Project Structure

```
Bharat_Bricks/
├── app/
│   ├── __init__.py
│   ├── config.py                  # Centralized configuration (loads from .env)
│   ├── schemas.py                 # Pydantic models for all request/response schemas
│   ├── main.py                    # FastAPI app with REST, WebSocket, and frontend routes
│   ├── chains/
│   │   ├── __init__.py
│   │   ├── audit.py               # Auditing Agent - LCEL chain for content extraction
│   │   └── companion.py           # Companion Agent - LCEL chain with conversation memory
│   └── utils/
│       ├── __init__.py
│       └── drive.py               # Google Drive API v3 integration (list + download files)
├── frontend/
│   └── index.html                 # Chat UI (dark-themed, WebSocket-based)
├── guardrails.txt                 # Strict guardrails for the Auditing Agent
├── companion_guardrails.txt       # Empathetic guardrails for the Companion Agent
├── requirements.txt               # Python dependencies
├── run_resume.py                  # Resilient multi-model resume script
├── response.json                  # Raw audit results (incrementally written)
├── response_final.json            # Deduplicated + numerically sorted audit results
├── .env                           # Environment variables (not committed)
└── README.md
```

---

## Agent 1: Auditing Agent

The Auditing Agent is an **admin-only** tool that curates the knowledge base by scanning documents and extracting only the content relevant to gender studies, LGBTQ+ rights, and sexuality.

### How It Works

1. **File Listing**: Uses the Google Drive API v3 with pagination to list all `.md` files from a shared Drive folder (supports 500+ files).
2. **Sequential Download**: Downloads each `.md` file one at a time to a temporary directory using `gdown`.
3. **Chunking**: Large documents are split into chunks of up to 20,000 characters using LangChain's `RecursiveCharacterTextSplitter` to stay within LLM context limits.
4. **Per-Chunk Auditing**: Each chunk is sent through an LCEL chain (`ChatPromptTemplate | structured_llm`) that evaluates relevance and extracts verbatim text.
5. **Structured Output**: The LLM is constrained to return JSON via `ChatOpenAI.with_structured_output(ChunkAuditResult, method="json_mode")`, ensuring reliable schema-conformant responses.
6. **Aggregation**: Relevant text from all chunks of a single file is concatenated with chunk markers (`--- Chunk N ---`) into a single `AuditResult`.
7. **Cleanup**: Each temporary file is deleted immediately after processing.
8. **Incremental Saving**: Results are written to `response.json` after every file, so progress is preserved even if the process is interrupted.

### Audit Guardrails (`guardrails.txt`)

The audit guardrails are intentionally strict and threatening to ensure the LLM performs pure verbatim extraction without summarization:

- **Approved topics**: Gender studies, queer theory, LGBTQ+ laws, constitutional protections, gender identity policies, sociological/historical literature on gender diversity.
- **Forbidden behaviors**: Summarization, paraphrasing, ellipsis, placeholders, partial extraction.
- **Rule**: If relevant, copy every single word. If irrelevant, return an empty string.

### Audit Output Schema

```
ChunkAuditResult:
  - is_relevant (bool)
  - relevance_score (float, 0.0 to 1.0)
  - relevant_text (str, verbatim extracted or empty)

AuditResult:
  - filename (str)
  - is_relevant (bool)
  - relevance_score (float, 0.0 to 1.0)
  - relevant_text (str, concatenated from all relevant chunks)
```

### Audit Results

After processing 513 `.md` files from the knowledge base:
- **Total files processed**: 513
- **Relevant**: 95 files
- **Irrelevant**: 418 files

Results are stored in `response_final.json` (deduplicated, numerically sorted by filename).

---

## Agent 2: Companion Agent

The Companion Agent is the **user-facing** AI friend that people can talk to about their gender identity, sexuality, and LGBTQ+ experiences.

### How It Works

1. **LLM**: Uses a separate, more capable model (configurable via `COMPANION_MODEL` env var, defaults to `databricks-meta-llama-3-3-70b-instruct`).
2. **Conversation Memory**: Powered by LangChain's `RunnableWithMessageHistory` with `ChatMessageHistory`. Each WebSocket connection gets a unique `session_id`, and the full conversation history is maintained in-memory for the duration of the session.
3. **Privacy by Design**: No messages are persisted anywhere. All conversation history lives in RAM and is lost when the server restarts or the session disconnects. This is intentional.
4. **Guardrails**: The companion operates under strict safety guardrails defined in `companion_guardrails.txt`.
5. **LCEL Chain**: `ChatPromptTemplate (with MessagesPlaceholder for history) | ChatOpenAI`, wrapped in `RunnableWithMessageHistory`.

### Companion Guardrails (`companion_guardrails.txt`)

- **Empathy first**: Always acknowledge feelings before responding.
- **Scope**: Gender identity, sexual orientation, LGBTQ+ experiences, coming out, relationships, self-acceptance, emotional well-being.
- **No medical advice**: Redirects to healthcare professionals.
- **No legal advice**: Redirects to LGBTQ+ legal aid organizations.
- **Crisis protocol**: If the user expresses suicidal thoughts or self-harm, the agent immediately provides helpline numbers:
  - iCall (India): 9152987821
  - Vandrevala Foundation: 1860-2662-345
  - The Trevor Project (US): 1-866-488-7386
- **No harmful content**: Refuses sexually explicit, violent, or hateful requests.
- **Privacy**: Never references past sessions.
- **Stays in character**: Gently redirects off-topic requests back to its role.
- **Tone**: Warm, gentle, affirming, conversational. Mirrors the user's energy.

### Session Management

- Each WebSocket connection is assigned a UUID-based `session_id`.
- A Python dictionary maps `session_id` to `ChatMessageHistory` instances.
- The `RunnableWithMessageHistory` wrapper automatically loads and saves messages per session.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Full audit: processes all `.md` files from Google Drive (starts fresh) |
| `POST` | `/ingest/resume` | Resume audit: skips files already in `response.json`, processes only missing ones |
| `POST` | `/chat` | REST chat endpoint (JSON request/response) |
| `WS` | `/ws/chat` | WebSocket chat endpoint (persistent connection, typing indicators) |
| `GET` | `/` | Serves the frontend chat UI |
| `GET` | `/docs` | Auto-generated Swagger UI (FastAPI) |

### WebSocket Protocol (`/ws/chat`)

**Server -> Client messages:**
- `{"type": "session", "session_id": "..."}` — sent on connection, assigns session ID
- `{"type": "typing"}` — sent while the LLM is generating a response
- `{"type": "response", "message": "..."}` — the companion's reply
- `{"type": "error", "message": "..."}` — error details

**Client -> Server messages:**
- `{"message": "..."}` — the user's message

---

## Frontend

A single-page dark-themed chat UI served at `http://127.0.0.1:8000/`.

### Features
- Connects via WebSocket (not REST) for persistent, low-latency communication
- Automatic reconnection on disconnect (3-second retry)
- Animated typing indicator while the AI responds
- Auto-expanding textarea input
- Shift+Enter for newlines, Enter to send
- Responsive design (max-width 720px, centered)
- Privacy disclaimer displayed at the bottom
- Rainbow-gradient SafeSpace logo/branding

---

## Configuration

All configuration is loaded from a `.env` file at the project root via `python-dotenv`. The `app/config.py` module centralizes access to all settings:

| Variable | Purpose |
|----------|---------|
| `DATABRICKS_TOKEN` | Authentication token for the Databricks AI Gateway |
| `DATABRICKS_BASE_URL` | Base URL for the Databricks AI Gateway (OpenAI-compatible) |
| `LLM_MODEL` | Model used by the Auditing Agent |
| `COMPANION_MODEL` | Model used by the Companion Agent (falls back to `LLM_MODEL` if not set) |
| `EMBEDDING_MODEL` | Embedding model for the RAG pipeline |
| `DRIVE_FOLDER_URL` | Google Drive shared folder URL containing `.md` knowledge base files |
| `GOOGLE_API_KEY` | Google Cloud API key for Google Drive API v3 access |

---

## LangChain Features Used

This project deliberately uses built-in LangChain features rather than coding from scratch:

| Feature | LangChain Component | Used In |
|---------|---------------------|---------|
| LLM Integration | `ChatOpenAI` (langchain-openai) | Both agents |
| Prompt Templates | `ChatPromptTemplate` | Both agents |
| Structured Output | `.with_structured_output(schema, method="json_mode")` | Audit Agent |
| Text Splitting | `RecursiveCharacterTextSplitter` (langchain-text-splitters) | Audit Agent |
| LCEL Chains | `prompt \| llm` pipe syntax | Both agents |
| Runnables | `RunnableLambda` | Audit Agent |
| Conversation Memory | `RunnableWithMessageHistory` (langchain-core) | Companion Agent |
| Message History | `ChatMessageHistory` (langchain-community) | Companion Agent |
| History Placeholder | `MessagesPlaceholder` | Companion Agent |
| Batch Processing | `.batch()` on LCEL chains | Audit Agent |
| Pydantic Schemas | `BaseModel` with `Field` descriptions | Both agents |

---

## How to Run

### Prerequisites
- Python 3.10+
- A `.env` file with the required variables (see Configuration section)

### Setup

```bash
cd Bharat_Bricks
python -m venv venv
source venv/Scripts/activate    # Windows Git Bash
# or: .\venv\Scripts\Activate.ps1  (PowerShell)
# or: venv\Scripts\activate.bat    (cmd)

pip install -r requirements.txt
```

### Start the Server

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Use the Platform

- **Chat UI**: Open http://127.0.0.1:8000 in your browser
- **API Docs**: Open http://127.0.0.1:8000/docs for Swagger UI
- **Run Audit**: `curl -X POST http://127.0.0.1:8000/ingest`
- **Resume Audit**: `curl -X POST http://127.0.0.1:8000/ingest/resume`
- **REST Chat**: `curl -X POST http://127.0.0.1:8000/chat -H "Content-Type: application/json" -d '{"session_id": "test", "message": "Hello"}'`

---

## Resilient Resume Script

`run_resume.py` is a standalone script that automates the auditing process across multiple LLM models. If one model hits a rate limit, it automatically switches to the next available model and resumes processing.

### Models Cycled (in order)
1. `databricks-qwen3-next-80b-a3b-instruct` (MoE, 80B total / ~3B active)
2. `databricks-meta-llama-3-3-70b-instruct` (70B)
3. `databricks-gpt-oss-20b` (20B)
4. `databricks-gemma-3-12b` (12B)

### Behavior
- Updates `LLM_MODEL` in `.env` for each attempt
- Starts a fresh uvicorn server for each model
- Kills any existing process on port 8000 before starting
- Hits `POST /ingest/resume` (skips already-processed files)
- If all 4 models fail, prints a summary with each model's failure reason

### Usage

```bash
source venv/Scripts/activate
python -u run_resume.py
```

---

## Output Files

| File | Description |
|------|-------------|
| `response.json` | Raw audit results, incrementally written as each file is processed. May contain duplicates if the process was restarted. |
| `response_final.json` | Cleaned version: deduplicated (keeping the variant with the longest `relevant_text`), sorted numerically by filename (1.md, 2.md, ..., 513.md). This is the authoritative audit output. |

---

## Future Work

- **RAG Pipeline**: Connect the embedded knowledge base vectors to the Companion Agent so it can retrieve and reference relevant documents when answering user questions.
- **Voice Mode**: Integrate STT (Speech-to-Text) and TTS (Text-to-Speech) pipelines through the existing WebSocket endpoint for voice-based conversations.
- **MCP Tools**: Extend the Companion Agent from a simple LCEL chain to a LangChain Agent with tool-calling capabilities.
