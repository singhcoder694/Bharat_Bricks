"""
Resilient resume script: cycles through 4 candidate models (10B-80B)
and hits POST /ingest/resume. If one model fails (rate limit, error, etc.),
it updates .env with the next model, restarts the server, and retries.
Stops only when all 4 models have failed in the same round.
"""

import subprocess
import sys
import requests
import time
import re
import os

sys.stdout.reconfigure(line_buffering=True)

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


def kill_port_8000():
    """Kill any process occupying port 8000 (Windows-specific)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=5,
        )
        for line in result.stdout.splitlines():
            if ":8000" in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                print(f"  Killing existing process on port 8000 (PID {pid})...")
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, timeout=5)
                time.sleep(2)
    except Exception:
        pass


def start_server() -> subprocess.Popen:
    kill_port_8000()

    log_path = os.path.join(os.path.dirname(__file__), "server.log")
    log_file = open(log_path, "w", encoding="utf-8")

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=log_file,
        stderr=subprocess.STDOUT,
        cwd=os.path.dirname(__file__),
    )
    deadline = time.time() + STARTUP_TIMEOUT
    while time.time() < deadline:
        if proc.poll() is not None:
            log_file.close()
            with open(log_path, "r", encoding="utf-8") as f:
                output = f.read()
            raise RuntimeError(f"Server process exited (code {proc.returncode}):\n{output[:1000]}")
        try:
            r = requests.get(f"{SERVER_URL}/docs", timeout=2)
            if r.status_code == 200:
                print("  Server is up.")
                return proc
        except requests.ConnectionError:
            pass
        time.sleep(1)

    log_file.close()
    with open(log_path, "r", encoding="utf-8") as f:
        output = f.read()
    proc.kill()
    raise RuntimeError(f"Server failed to start within {STARTUP_TIMEOUT}s. Log:\n{output[:1000]}")


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
