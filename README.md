# Tritiya — LGBTQ+ AI Companion Platform

Tritiya is an AI-powered platform built for the **Bharat Bricks hackathon (Databricks)** that provides a private, empathetic AI companion for people exploring their gender identity and sexuality. The platform is built entirely on the **Databricks ecosystem** and **LangChain**, and comprises three core subsystems:

1. **Auditing Agent** — An admin-only LangChain agent that scans 500+ documents and extracts only LGBTQ+-relevant content using strict verbatim-extraction guardrails.
2. **Embedding Pipeline** — A Databricks notebook that chunks the audited text, generates embeddings via `bge-large-en`, and stores them in a **Databricks Mosaic AI Vector Search** index.
3. **Companion Agent** — A user-facing empathetic AI companion with **Agentic RAG** (selective retrieval), conversation memory, multilingual support, and voice capabilities (STT/TTS via Sarvam AI).

All LLM inference runs through the **Databricks AI Gateway** (OpenAI-compatible). The Companion Agent uses **LangChain Tool Calling** to selectively query the knowledge base only when the user asks factual questions — casual messages like "Hi" are answered directly without retrieval.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [How to Run](#how-to-run)
  - [1. Backend (FastAPI)](#1-backend-fastapi)
  - [2. Frontend — Web Client (React + Vite)](#2-frontend--web-client-react--vite)
  - [3. Frontend — Mobile Client (React Native + Expo)](#3-frontend--mobile-client-react-native--expo)
- [Environment Variables](#environment-variables)
- [Agent 1: Auditing Agent](#agent-1-auditing-agent)
- [Embedding Pipeline](#embedding-pipeline)
- [Agent 2: Companion Agent (with Agentic RAG)](#agent-2-companion-agent-with-agentic-rag)
- [Voice: Speech-to-Text and Text-to-Speech](#voice-speech-to-text-and-text-to-speech)
- [API Reference](#api-reference)
- [LangChain Features Used](#langchain-features-used)
- [Output Files](#output-files)
- [Troubleshooting](#troubleshooting)

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Databricks Cloud                               │
│                                                                       │
│  ┌──────────────────────┐    ┌─────────────────────────────────────┐  │
│  │   AI Gateway          │    │   Mosaic AI Vector Search           │  │
│  │                       │    │                                     │  │
│  │  LLMs:                │    │   Endpoint: rag_endpoint            │  │
│  │  • Llama 3.3 70B      │    │   Index: main.rag.docs_index        │  │
│  │  • GPT-OSS-20B        │    │   742 chunks, 1024-dim embeddings   │  │
│  │  • Qwen3 80B          │    │   (bge-large-en via AI Gateway)     │  │
│  │                       │    │                                     │  │
│  │  Embeddings:          │    └──────────────┬──────────────────────┘  │
│  │  • bge-large-en       │                   │                        │
│  └──────────┬────────────┘                   │                        │
└─────────────┼────────────────────────────────┼────────────────────────┘
              │                                │
              │  OpenAI-compatible API          │  Vector Search SDK
              │                                │
┌─────────────┼────────────────────────────────┼────────────────────────┐
│             │         FastAPI Backend (app/)  │                        │
│             │                                │                        │
│  ┌──────────▼──────────┐  ┌──────────────────▼──────────────────┐     │
│  │   Auditing Agent     │  │   Companion Agent                   │     │
│  │   (chains/audit.py)  │  │   (chains/companion.py)             │     │
│  │                      │  │                                     │     │
│  │  • Chunking (20K)    │  │  • Agentic RAG (LangChain tools)   │     │
│  │  • Structured output │  │  • Conversation memory (5 turns)    │     │
│  │  • Batch processing  │  │  • Empathetic guardrails            │     │
│  │  • Verbatim extract  │  │  • Multilingual support             │     │
│  └──────────────────────┘  └───────────┬─────────────────────────┘     │
│                                        │                               │
│  ┌─────────────────────┐  ┌────────────▼───────────────────────┐      │
│  │   Sarvam AI          │  │   query_knowledgebase (@tool)      │      │
│  │   • STT (saarika)    │  │   Embed query → Vector Search →   │      │
│  │   • TTS (bulbul)     │  │   Return top-K chunks              │      │
│  └─────────────────────┘  └────────────────────────────────────┘      │
│                                                                        │
│  Endpoints: POST /chat, WS /ws/chat, POST /transcribe, POST /tts      │
│             POST /ingest, POST /ingest/resume, GET /docs               │
└──────────────────────────┬─────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │  Web Client  │ │ RN Client│ │  Test UI     │
     │  React+Vite  │ │  Expo    │ │  (frontend/) │
     │ (web-client/)│ │(rn_client)│ │              │
     └─────────────┘ └──────────┘ └─────────────┘
```

### Agentic RAG Flow

The Companion Agent uses **selective retrieval** — the LLM decides when to query the knowledge base:

```
User: "Hi"                              User: "What are transgender rights in India?"
  │                                        │
  ▼                                        ▼
LLM (with bound tool)                   LLM (with bound tool)
  │                                        │
  ▼                                        ▼
No tool call → Direct response           Calls query_knowledgebase(query="...")
                                           │
                                           ▼
                                         Embed query (bge-large-en)
                                           │
                                           ▼
                                         Vector Search (top 5 chunks)
                                           │
                                           ▼
                                         LLM generates grounded response
                                         with retrieved context
```

---

## Project Structure

```
Bharat_Bricks/
├── app/                                  # Backend (FastAPI + LangChain)
│   ├── .env                              # Environment variables (not committed)
│   ├── requirements.txt                  # Python dependencies
│   ├── run.py                            # Entry point: python app/run.py
│   ├── main.py                           # FastAPI app (REST + WebSocket + static routes)
│   ├── config.py                         # Centralized config (loads .env)
│   ├── schemas.py                        # Pydantic models for all request/response schemas
│   ├── guardrails.txt                    # Strict extraction guardrails for Auditing Agent
│   ├── companion_guardrails.txt          # Empathetic guardrails for Companion Agent
│   ├── chains/
│   │   ├── audit.py                      # Auditing Agent — LCEL chain with structured output
│   │   └── companion.py                  # Companion Agent — agent loop with tool calling
│   ├── utils/
│   │   ├── drive.py                      # Google Drive API v3 (list + download .md files)
│   │   ├── retriever.py                  # RAG: embedding + vector search + @tool
│   │   ├── sarvam_transcribe.py          # Sarvam AI speech-to-text
│   │   └── sarvam_tts.py                 # Sarvam AI text-to-speech
│   └── voice_transcription/              # Standalone voice API module (dev/testing)
│       ├── voice_api.py
│       └── run_server.py
│
├── web-client/                           # Web frontend (React + TypeScript + Vite)
│   ├── .env.example                      # Template for VITE_API_URL
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx                       # Main app with chat, TTS, STT integration
│       ├── components/                   # UI components (ChatHeader, MessageBubble, etc.)
│       ├── data/                         # Dummy data for development
│       └── lib/                          # API client helpers (agentChat, textToSpeech)
│
├── rn_client/                            # Mobile frontend (React Native + Expo)
│   ├── .env.example                      # Template for EXPO_PUBLIC_API_URL
│   ├── package.json
│   ├── App.tsx
│   └── src/
│       ├── components/                   # Native UI components + SpeakMode
│       ├── data/                         # Dummy data
│       └── theme.ts                      # Design tokens
│
├── embedding_pipeline/                   # Databricks notebook for creating embeddings
│   ├── embedding_pipeline.ipynb          # Jupyter notebook (run on Databricks)
│   └── data/
│       └── response_final.json           # Input: 95 audited documents
│
├── data_ingester_cli_v1/                 # Shell scripts for bulk upload to Unity Catalog
│   ├── data_bricks_bulk_upload.sh
│   └── rename_docs_sequential.sh
│
├── frontend/                             # Minimal test frontend (single HTML file)
│   └── index.html
│
├── response.json                         # Raw audit results (incrementally written)
├── response_final.json                   # Cleaned audit output (95 relevant docs)
├── run_resume.py                         # Resilient multi-model audit resume script
└── .env.example                          # Template for root-level env vars
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Python** | 3.10+ | Backend |
| **Node.js** | 18+ | Web frontend (Vite dev server) |
| **npm** | 9+ | Package management for web-client |
| **Databricks AI Gateway access** | — | LLM and embedding inference |
| **Databricks Vector Search index** | — | Pre-built (see Embedding Pipeline) |
| **Sarvam AI API key** (optional) | — | Voice features (STT/TTS) |

---

## How to Run

### 1. Backend (FastAPI)

```bash
# Clone and navigate to the project
cd Bharat_Bricks

# Create and activate a virtual environment
python -m venv venv

# Activate (pick one for your shell):
source venv/Scripts/activate          # Git Bash on Windows
# OR
.\venv\Scripts\Activate.ps1           # PowerShell
# OR
venv\Scripts\activate.bat             # cmd.exe
# OR
source venv/bin/activate              # macOS / Linux

# Install Python dependencies
pip install -r app/requirements.txt

# Create the environment file from the template
cp app/.env.example app/.env
# Then edit app/.env and fill in your actual values (see Environment Variables below)

# Start the server
python app/run.py
```

The server starts on **http://localhost:8000**. You should see:

```
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

To stop: press **Ctrl+C** in the terminal. The process exits cleanly.

**Verify the backend is running:**
- Open http://localhost:8000/docs in your browser for the Swagger UI
- Or test with curl:
  ```bash
  curl -X POST http://localhost:8000/chat \
    -H "Content-Type: application/json" \
    -d '{"session_id": "test", "message": "Hello"}'
  ```

### 2. Frontend — Web Client (React + Vite)

Open a **new terminal** (keep the backend running in the first one):

```bash
cd Bharat_Bricks/web-client

# Install Node dependencies
npm install

# Create the environment file
cp .env.example .env
# Edit .env and ensure it contains:
#   VITE_API_URL=http://127.0.0.1:8000

# Start the Vite dev server
npm run dev
```

The web client starts on **http://localhost:5173**. Open it in your browser. It communicates with the FastAPI backend at the URL specified in `VITE_API_URL`.

### 3. Frontend — Mobile Client (React Native + Expo)

Open a **new terminal**:

```bash
cd Bharat_Bricks/rn_client

# Install dependencies
npm install

# Create the environment file
cp .env.example .env
# Edit .env:
#   For Android emulator: EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
#   For physical device: EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8000

# Start Expo
npx expo start
```

---

## Environment Variables

The backend loads its configuration from `app/.env`. Create this file from the template:

```bash
cp app/.env.example app/.env
```

Then fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABRICKS_TOKEN` | Yes | Personal Access Token for the Databricks AI Gateway |
| `DATABRICKS_BASE_URL` | Yes | AI Gateway base URL (OpenAI-compatible, ends with `/mlflow/v1`) |
| `LLM_MODEL` | Yes | Model for the Auditing Agent (e.g. `databricks-gpt-oss-20b`) |
| `COMPANION_MODEL` | Yes | Model for the Companion Agent (e.g. `databricks-meta-llama-3-3-70b-instruct`) |
| `EMBEDDING_MODEL` | No | Embedding model name (default: `databricks-bge-large-en`) |
| `DRIVE_FOLDER_URL` | For audit | Google Drive shared folder URL with `.md` knowledge base files |
| `GOOGLE_API_KEY` | For audit | Google Cloud API key for Drive API v3 access |
| `VS_WORKSPACE_URL` | Yes | Databricks workspace URL hosting the Vector Search index |
| `VS_TOKEN` | Yes | PAT for the Vector Search workspace |
| `VS_ENDPOINT` | Yes | Vector Search endpoint name (default: `rag_endpoint`) |
| `VS_INDEX` | Yes | Vector Search index name (default: `main.rag.docs_index`) |
| `RAG_TOP_K` | No | Number of chunks to retrieve (default: `5`) |
| `SARVAM_API_KEY` | For voice | Sarvam AI subscription key for STT/TTS |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173,http://127.0.0.1:5173`) |

**Example `app/.env`:**

```env
DATABRICKS_TOKEN=dapi884febe904addc9ad234e045addd6e1a
DATABRICKS_BASE_URL=https://7474652923398162.ai-gateway.cloud.databricks.com/mlflow/v1
LLM_MODEL=databricks-gpt-oss-20b
COMPANION_MODEL=databricks-meta-llama-3-3-70b-instruct
EMBEDDING_MODEL=databricks-bge-large-en

DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/1IK1uiaZPqTq41Tl2ULl6im39GZbXQL7y
GOOGLE_API_KEY=your-google-api-key

VS_WORKSPACE_URL=https://dbc-6b19f5c4-5b21.cloud.databricks.com
VS_TOKEN=your-vector-search-workspace-pat
VS_ENDPOINT=rag_endpoint
VS_INDEX=main.rag.docs_index
RAG_TOP_K=5

SARVAM_API_KEY=your-sarvam-api-key
```

---

## Agent 1: Auditing Agent

The Auditing Agent is an **admin-only** tool that curates the knowledge base by scanning 500+ documents and extracting only content relevant to gender studies, LGBTQ+ rights, and sexuality.

### Pipeline

1. **File Listing**: Google Drive API v3 with pagination lists all `.md` files from a shared folder.
2. **Sequential Download**: Each file is downloaded to a temp directory.
3. **Chunking**: Large documents are split into 20,000-character chunks using `RecursiveCharacterTextSplitter`.
4. **Per-Chunk Auditing**: Each chunk passes through an LCEL chain (`ChatPromptTemplate | structured_llm`) with `with_structured_output(ChunkAuditResult, method="json_mode")`.
5. **Aggregation**: Relevant text from all chunks of a file is concatenated with chunk markers into a single `AuditResult`.
6. **Incremental Saving**: Results are written to `response.json` after every file.

### Guardrails (`app/guardrails.txt`)

The audit guardrails enforce strict verbatim extraction:
- **Approved topics**: Gender studies, queer theory, LGBTQ+ laws, constitutional protections, gender identity policies.
- **Forbidden**: Summarization, paraphrasing, ellipsis, placeholders, partial extraction.
- **Rule**: If relevant, copy every word. If irrelevant, return empty string.

### Running the Audit

```bash
# Full audit (processes all files from scratch)
curl -X POST http://localhost:8000/ingest

# Resume audit (skips already-processed files)
curl -X POST http://localhost:8000/ingest/resume
```

### Results

After processing 513 `.md` files: **95 relevant**, 418 irrelevant. Output stored in `response_final.json`.

---

## Embedding Pipeline

The embedding pipeline runs as a **Databricks notebook** (`embedding_pipeline/embedding_pipeline.ipynb`). It:

1. Loads `response_final.json` (95 documents with relevant text).
2. Splits them into **742 chunks** (512 tokens, 50 token overlap) using `RecursiveCharacterTextSplitter`.
3. Embeds each chunk using `bge-large-en` via the Databricks Foundation Model API (1024 dimensions).
4. Stores rows in a Delta table `main.rag.document_embeddings`.
5. Creates a **Delta Sync vector index** `main.rag.docs_index` on endpoint `rag_endpoint`.

The vector index is pre-built and hosted on Databricks. The backend connects to it at runtime using the `VS_*` environment variables.

---

## Agent 2: Companion Agent (with Agentic RAG)

The Companion Agent is the **user-facing** AI companion.

### Key Features

| Feature | Implementation |
|---------|---------------|
| **Agentic RAG** | LangChain `@tool` + `bind_tools()` — LLM decides when to query the knowledge base |
| **Conversation Memory** | `RunnableWithMessageHistory` with `ChatMessageHistory` (5-turn window, 10 messages) |
| **Privacy by Design** | No messages persisted. All history is in-memory, lost on restart. |
| **Multilingual** | Responds in user's language (Hindi, Tamil, English, code-mixed, etc.) |
| **Empathetic Guardrails** | Crisis protocol with helpline numbers, no medical/legal advice |
| **Voice** | STT (Sarvam saarika) and TTS (Sarvam bulbul) via `/transcribe` and `/tts` |

### How the Agent Loop Works (`chains/companion.py`)

```python
def _run_agent(inputs):
    messages = companion_prompt.invoke(inputs).to_messages()
    response = companion_llm_with_tools.invoke(messages)     # First LLM call

    if not response.tool_calls:
        return response                                       # Direct answer

    # Tool was called — execute retrieval
    for tc in response.tool_calls:
        result = query_knowledgebase.invoke(tc["args"])        # Embed + search
        messages.append(ToolMessage(content=result, ...))

    final = companion_llm_with_tools.invoke(messages)          # Second LLM call
    return final                                               # Grounded answer
```

### The `query_knowledgebase` Tool (`utils/retriever.py`)

A LangChain `@tool` that:
1. Embeds the query using `bge-large-en` via the AI Gateway.
2. Queries the Databricks Vector Search index for the top-K most similar chunks.
3. Returns formatted context with source file citations.

The LLM only calls this tool when the user asks factual questions about laws, rights, policies, court rulings, etc. Greetings, emotional support, and casual conversation are handled directly.

### Companion Guardrails (`app/companion_guardrails.txt`)

- **Empathy first**: Acknowledge feelings before anything else.
- **Crisis protocol**: Suicidal thoughts/self-harm triggers immediate helpline numbers (iCall, Vandrevala Foundation, Trevor Project).
- **No medical/legal advice**: Redirects to professionals.
- **Stays in character**: Gently redirects off-topic requests.
- **Knowledge base**: Uses the `query_knowledgebase` tool only for factual queries; never exposes retrieval metadata (chunk numbers, source tags) to the user.
- **Tone**: Warm, gentle, affirming, conversational.

---

## Voice: Speech-to-Text and Text-to-Speech

Voice features are powered by **Sarvam AI** and support Indian languages + English.

| Endpoint | Service | Model | Description |
|----------|---------|-------|-------------|
| `POST /transcribe` | Sarvam STT | `saarika:v2.5` | Accepts audio file upload, returns transcribed text + detected language |
| `POST /tts` | Sarvam TTS | `bulbul:v3` | Accepts text + target language, returns base64-encoded MP3 segments |

The TTS endpoint includes a 1-hour server-side cache (256 entries) to avoid redundant API calls.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | REST chat endpoint (JSON body: `session_id`, `message`, optional `language_code`) |
| `WS` | `/ws/chat` | WebSocket chat (persistent connection, typing indicators) |
| `POST` | `/transcribe` | Speech-to-text (multipart file upload) |
| `POST` | `/tts` | Text-to-speech (JSON body: `text`, `target_language_code`) |
| `POST` | `/ingest` | Full audit: process all `.md` files from Google Drive |
| `POST` | `/ingest/resume` | Resume audit: skip already-processed files |
| `GET` | `/` | Serves the test frontend (`frontend/index.html`) |
| `GET` | `/docs` | Auto-generated Swagger UI |

### WebSocket Protocol (`/ws/chat`)

**Server → Client:**
| Message | Description |
|---------|-------------|
| `{"type": "session", "session_id": "..."}` | Sent on connection, assigns session ID |
| `{"type": "typing"}` | Sent while the LLM is generating |
| `{"type": "response", "message": "..."}` | The companion's reply |
| `{"type": "error", "message": "..."}` | Error details |

**Client → Server:**
| Message | Description |
|---------|-------------|
| `{"message": "...", "language_code": "..."}` | User's message (language_code is optional) |

### REST Chat Example

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo", "message": "What are transgender rights in India?"}'
```

---

## LangChain Features Used

| Feature | LangChain Component | Used In |
|---------|---------------------|---------|
| LLM Integration | `ChatOpenAI` (langchain-openai) | Both agents |
| Prompt Templates | `ChatPromptTemplate`, `MessagesPlaceholder` | Both agents |
| Structured Output | `.with_structured_output(schema, method="json_mode")` | Audit Agent |
| Text Splitting | `RecursiveCharacterTextSplitter` | Audit Agent |
| LCEL Chains | `prompt \| llm` pipe syntax | Both agents |
| Runnables | `RunnableLambda` | Both agents |
| Tool Calling | `@tool`, `bind_tools()`, `ToolMessage` | Companion Agent (Agentic RAG) |
| Conversation Memory | `RunnableWithMessageHistory` | Companion Agent |
| Message History | `ChatMessageHistory` (langchain-community) | Companion Agent |
| Embeddings | `OpenAIEmbeddings` (langchain-openai) | RAG retriever |
| Batch Processing | `.batch()` on LCEL chains | Audit Agent |
| Pydantic Schemas | `BaseModel` with `Field` | Both agents |

---

## Output Files

| File | Description |
|------|-------------|
| `response.json` | Raw audit results, incrementally written. May contain duplicates if restarted. |
| `response_final.json` | Cleaned: deduplicated (longest `relevant_text` wins), sorted numerically by filename. 95 relevant documents. |

---

## Troubleshooting

### Port 8000 already in use

If the server fails to start with "Address already in use":

```bash
# Find the process
netstat -ano | grep ":8000"

# Kill it (Windows)
taskkill /F /PID <pid>

# Kill it (macOS/Linux)
kill -9 <pid>
```

### Frontend shows "Disconnected"

Make sure the backend is running (`python app/run.py`). The web-client requires `VITE_API_URL` in `web-client/.env` to point to the running backend.

### RAG not working / empty responses

1. Check that `VS_WORKSPACE_URL`, `VS_TOKEN`, `VS_ENDPOINT`, and `VS_INDEX` are correctly set in `app/.env`.
2. The Vector Search endpoint must be running on the Databricks workspace.
3. Check the terminal logs — when RAG triggers, you'll see:
   ```
   [AGENT] Tool call: query_knowledgebase(query='...')
   [RAG] Query: '...'
   [RAG] Retrieved 5 chunks:
     [1] 12.md (chunk 1.0) — ...
   ```

### Voice features not working

Ensure `SARVAM_API_KEY` is set in `app/.env`. Get a key from https://docs.sarvam.ai.

### Terminal logs

When the server is running, all activity is logged to the terminal:

```
[USER] Hi
[LLM] Hello! I'm here to listen and support you...

[USER] What are transgender rights in India?
[AGENT] Tool call: query_knowledgebase(query='transgender rights in India')
[RAG] Query: 'transgender rights in India'
[RAG] Retrieved 5 chunks:
  [1] 12.md (chunk 1.0) — Legal Recognition Transgender Identity...
  [2] 166.md (chunk 0.0) — A two-judge bench of the Supreme Court...
[LLM] The transgender community in India has made significant strides...
```
