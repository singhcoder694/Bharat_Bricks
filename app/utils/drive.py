import os
import re
import tempfile
import requests
import gdown

from app.config import DRIVE_FOLDER_URL, GOOGLE_API_KEY

DRIVE_API = "https://www.googleapis.com/drive/v3/files"


def _extract_folder_id(folder_url: str) -> str:
    match = re.search(r"/folders/([a-zA-Z0-9_-]+)", folder_url)
    if not match:
        raise ValueError(f"Cannot extract folder ID from: {folder_url}")
    return match.group(1)


def list_folder_files() -> list[dict]:
    """List ALL .md files in a Google Drive folder using the Drive API v3 with pagination.
    Returns list of {"id": str, "name": str} dicts sorted by name.
    """
    folder_id = _extract_folder_id(DRIVE_FOLDER_URL)
    all_files = []
    page_token = None

    while True:
        params = {
            "q": f"'{folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder'",
            "pageSize": 1000,
            "fields": "nextPageToken, files(id, name)",
            "key": GOOGLE_API_KEY,
        }
        if page_token:
            params["pageToken"] = page_token

        r = requests.get(DRIVE_API, params=params)
        r.raise_for_status()
        data = r.json()

        all_files.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    md_files = [f for f in all_files if f["name"].endswith(".md")]
    return sorted(md_files, key=lambda x: x["name"])


def download_single_file(file_id: str, filename: str) -> str:
    """Download a single file from Google Drive to a temp location.
    Returns the path to the downloaded temp file.
    """
    temp_dir = tempfile.mkdtemp(prefix="safespace_")
    output_path = os.path.join(temp_dir, filename)
    gdown.download(id=file_id, output=output_path, quiet=False)
    return output_path
