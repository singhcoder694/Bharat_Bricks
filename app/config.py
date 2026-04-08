import os
from dotenv import load_dotenv

load_dotenv(override=True)

DATABRICKS_TOKEN = os.environ.get("DATABRICKS_TOKEN")
DATABRICKS_BASE_URL = os.environ.get("DATABRICKS_BASE_URL")

AUDIT_LLM_MODEL = os.environ.get("LLM_MODEL")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL")

DRIVE_FOLDER_URL = os.environ.get("DRIVE_FOLDER_URL")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

GUARDRAILS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "guardrails.txt")

COMPANION_LLM_MODEL = os.environ.get("COMPANION_MODEL", os.environ.get("LLM_MODEL"))
COMPANION_GUARDRAILS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "companion_guardrails.txt")

# Sarvam AI speech-to-text — https://docs.sarvam.ai
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY") or os.environ.get("SARVAM_SUBSCRIPTION_KEY")
SARVAM_API_BASE = os.environ.get("SARVAM_API_BASE", "https://api.sarvam.ai").rstrip("/")
SARVAM_STT_MODEL = os.environ.get("SARVAM_STT_MODEL", "saarika:v2.5")
SARVAM_LANGUAGE_CODE = os.environ.get("SARVAM_LANGUAGE_CODE", "unknown")
SARVAM_STT_MODE = os.environ.get("SARVAM_STT_MODE", "transcribe")

# Comma-separated origins for browser clients (e.g. Vite web-client on :5173)
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]
