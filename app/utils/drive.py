import os
import tempfile
import requests
import gdown
from gdown.download_folder import _download_and_parse_google_drive_link


def list_folder_files(folder_url: str) -> list[dict]:
    """List .md files in a Google Drive shared folder WITHOUT downloading them.
    Returns list of {"id": str, "name": str} dicts sorted by name.
    """
    sess = requests.Session()
    _, root_folder = _download_and_parse_google_drive_link(
        sess, folder_url, quiet=False, remaining_ok=True
    )
    files = []
    for child in root_folder.children:
        if child.is_folder():
            continue
        if child.name.endswith(".md"):
            files.append({"id": child.id, "name": child.name})
    return sorted(files, key=lambda x: x["name"])


def download_single_file(file_id: str, filename: str) -> str:
    """Download a single file from Google Drive to a temp location.
    Returns the path to the downloaded temp file.
    """
    temp_dir = tempfile.mkdtemp(prefix="safespace_")
    output_path = os.path.join(temp_dir, filename)
    gdown.download(id=file_id, output=output_path, quiet=False)
    return output_path
