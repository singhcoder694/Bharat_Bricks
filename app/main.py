import os
import shutil
import json

from fastapi import FastAPI, HTTPException

from app.config import DRIVE_FOLDER_URL
from app.schemas import AuditResult
from app.chains.audit import file_chain
from app.utils.drive import list_folder_files, download_single_file

app = FastAPI(title="SafeSpace Admin - Audit Ingestion Pipeline")


@app.post("/ingest", response_model=list[AuditResult])
def ingest_knowledge_base():
    """Admin endpoint: list .md files from Drive, then for each file:
    download -> audit via LCEL chain -> delete -> move to next file."""

    print("Listing files in Google Drive folder...")
    file_list = list_folder_files(DRIVE_FOLDER_URL)
    if not file_list:
        raise HTTPException(status_code=404, detail="No .md files found in the Drive folder")

    print(f"Found {len(file_list)} .md files. Processing one by one...\n")

    results: list[AuditResult] = []
    for i, file_info in enumerate(file_list, 1):
        filename = file_info["name"]
        file_id = file_info["id"]
        print(f"[{i}/{len(file_list)}] Downloading: {filename}")

        try:
            file_path = download_single_file(file_id, filename)
            print(f"[{i}/{len(file_list)}] Auditing: {filename}")
            result = file_chain.invoke(file_path)
            results.append(result)
            print(f"[{i}/{len(file_list)}] Done: is_relevant={result.is_relevant}, score={result.relevance_score}")

            parent_dir = os.path.dirname(file_path)
            if os.path.isdir(parent_dir) and parent_dir.startswith(os.path.join(os.environ.get("TEMP", "/tmp"), "safespace_")):
                shutil.rmtree(parent_dir, ignore_errors=True)

        except Exception as e:
            print(f"[{i}/{len(file_list)}] ERROR on {filename}: {e}")
            results.append(AuditResult(
                filename=filename,
                is_relevant=False,
                relevance_score=0.0,
                relevant_text="",
            ))

        # Write to response.json incrementally
        with open("response.json", "w", encoding="utf-8") as f:
            json.dump([r.model_dump() if hasattr(r, "model_dump") else r.dict() for r in results], f, indent=4)

    return results
