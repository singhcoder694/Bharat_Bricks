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
