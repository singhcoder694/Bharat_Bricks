"""
Resilient resume script: cycles through 4 candidate models (10B-80B)
and hits POST /ingest/resume. If one model fails (rate limit, error, etc.),
it updates .env with the next model, restarts the server, and retries.
Stops only when all 4 models have failed in the same round.
"""

import subprocess
import requests
import time
import re
import os
import signal

MODELS = [
    "databricks-qwen3-next-80b-a3b-instruct",
    "databricks-meta-llama-3-3-70b-instruct",
    "databricks-gpt-oss-20b",
    "databricks-gemma-3-12b",
]

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
SERVER_URL = "http://127.0.0.1:8000"
RESUME_URL = f"{SERVER_URL}/ingest/resume"
STARTUP_TIMEOUT = 30
REQUEST_TIMEOUT = 7200  # 2 hours max per attempt


def set_model_in_env(model: str):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    content = re.sub(r"^LLM_MODEL=.*$", f"LLM_MODEL={model}", content, flags=re.MULTILINE)
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  .env updated: LLM_MODEL={model}")


def start_server() -> subprocess.Popen:
    proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    deadline = time.time() + STARTUP_TIMEOUT
    while time.time() < deadline:
        try:
            r = requests.get(f"{SERVER_URL}/docs", timeout=2)
            if r.status_code == 200:
                print("  Server is up.")
                return proc
        except requests.ConnectionError:
            pass
        time.sleep(1)
    raise RuntimeError("Server failed to start within timeout")


def stop_server(proc: subprocess.Popen):
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("  Server stopped.")


def try_resume(model: str) -> tuple[bool, str]:
    """Try to resume ingestion with the given model.
    Returns (success: bool, failure_reason: str).
    """
    print(f"\n{'='*60}")
    print(f"Trying model: {model}")
    print(f"{'='*60}")

    set_model_in_env(model)

    proc = None
    try:
        print("  Starting server...")
        proc = start_server()

        print(f"  Hitting POST {RESUME_URL} ...")
        r = requests.post(RESUME_URL, timeout=REQUEST_TIMEOUT)

        if r.status_code == 200:
            print(f"  SUCCESS! Status {r.status_code}")
            return True, ""
        else:
            reason = r.text[:500]
            print(f"  FAILED with status {r.status_code}: {reason}")
            return False, f"HTTP {r.status_code}: {reason}"

    except requests.exceptions.Timeout:
        reason = "Request timed out (exceeded 2 hours)"
        print(f"  FAILED: {reason}")
        return False, reason

    except requests.exceptions.ConnectionError as e:
        reason = f"Connection error: {e}"
        print(f"  FAILED: {reason}")
        return False, reason

    except Exception as e:
        reason = str(e)
        print(f"  FAILED: {reason}")
        return False, reason

    finally:
        stop_server(proc)
        time.sleep(2)


def main():
    print("Resilient Resume Script")
    print(f"Models to try: {MODELS}")
    print(f"Resume endpoint: {RESUME_URL}\n")

    failures: dict[str, str] = {}

    for model in MODELS:
        success, reason = try_resume(model)
        if success:
            print(f"\nAll done! Model '{model}' completed successfully.")
            return
        failures[model] = reason

    print(f"\n{'='*60}")
    print("ALL 4 MODELS FAILED. Stopping.")
    print(f"{'='*60}\n")
    for model, reason in failures.items():
        print(f"  {model}")
        print(f"    Reason: {reason}\n")


if __name__ == "__main__":
    main()
