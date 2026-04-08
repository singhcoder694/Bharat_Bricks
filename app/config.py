import os
from dotenv import load_dotenv

_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR = os.path.dirname(_APP_DIR)
load_dotenv(os.path.join(_PROJECT_DIR, ".env"), override=True)

DATABRICKS_TOKEN = os.environ.get("DATABRICKS_TOKEN")
DATABRICKS_BASE_URL = os.environ.get("DATABRICKS_BASE_URL")

AUDIT_LLM_MODEL = os.environ.get("LLM_MODEL")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL")

DRIVE_FOLDER_URL = os.environ.get("DRIVE_FOLDER_URL")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

# Unity Catalog Volumes
DATABRICKS_HOST = os.environ.get("DATABRICKS_HOST", "").rstrip("/")
UC_TOKEN = os.environ.get("UC_TOKEN") or DATABRICKS_TOKEN
UC_CATALOG = os.environ.get("UC_CATALOG", "main")
UC_SCHEMA = os.environ.get("UC_SCHEMA", "rag")
UC_VOLUME = os.environ.get("UC_VOLUME", "documents")

GUARDRAILS_PATH = os.path.join(os.path.dirname(__file__), "guardrails.txt")

COMPANION_LLM_MODEL = os.environ.get("COMPANION_MODEL", os.environ.get("LLM_MODEL"))
COMPANION_GUARDRAILS_PATH = os.path.join(os.path.dirname(__file__), "companion_guardrails.txt")

# Vector Search (Databricks workspace hosting the RAG index)
VS_WORKSPACE_URL = os.environ.get("VS_WORKSPACE_URL", "").rstrip("/")
VS_TOKEN = os.environ.get("VS_TOKEN") or DATABRICKS_TOKEN
VS_ENDPOINT = os.environ.get("VS_ENDPOINT", "rag_endpoint")
VS_INDEX = os.environ.get("VS_INDEX", "main.rag.docs_index")
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "5"))

# Sarvam AI speech-to-text — https://docs.sarvam.ai
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY") or os.environ.get("SARVAM_SUBSCRIPTION_KEY")
SARVAM_API_BASE = os.environ.get("SARVAM_API_BASE", "https://api.sarvam.ai").rstrip("/")
SARVAM_STT_MODEL = os.environ.get("SARVAM_STT_MODEL", "saarika:v2.5")
SARVAM_LANGUAGE_CODE = os.environ.get("SARVAM_LANGUAGE_CODE", "unknown")
SARVAM_STT_MODE = os.environ.get("SARVAM_STT_MODE", "transcribe")

# Sarvam text-to-speech — https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
SARVAM_TTS_MODEL = os.environ.get("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_TTS_SPEAKER = os.environ.get("SARVAM_TTS_SPEAKER", "shubh")


def _float_env(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


# bulbul:v3 pace range 0.5–2.0
_raw_pace = _float_env("SARVAM_TTS_PACE", 1.0)
SARVAM_TTS_PACE = max(0.5, min(2.0, _raw_pace))

# Comma-separated origins for browser clients (e.g. Vite web-client on :5173)
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]
