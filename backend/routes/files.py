"""
routes/files.py
─────────────────────────────────────────────────────────────────────────────
Purpose : FastAPI router for file management. Supports upload (as base64),
          listing, metadata update (description / tags), and deletion.
          Files are stored entirely in-memory as base64 strings (mock only).

Used by : main.py (mounted under /files prefix)
Imports : SECRET_KEY, ALGORITHM from routes/auth.py
          get_current_user dependency re-implemented locally (same pattern)

Key variables
  _FILE_LIST    – mutable in-memory list of file dicts (3 seed files)
  _next_id      – auto-increment counter for new files (starts at 4)

Endpoints
  GET    /files/       – list all files (content_base64 excluded for performance)
  GET    /files/{id}   – get single file including content_base64 (for viewers)
  POST   /files/       – upload a new file (full payload inc. content_base64)
  PUT    /files/{id}   – update description and tags only
  DELETE /files/{id}   – delete a file by id
"""
from __future__ import annotations

import base64
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from .auth import SECRET_KEY, ALGORITHM, MOCK_USERS

router   = APIRouter()
security = HTTPBearer()

# ── Auth dependency (same pattern as users.py) ────────────────────────────────
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub", "")
        if email not in MOCK_USERS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return MOCK_USERS[email]
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# ── Seed data ─────────────────────────────────────────────────────────────────
_txt_b64 = base64.b64encode(
    b"Hello, this is a sample text file.\n\n"
    b"It contains multiple lines of plain text.\n"
    b"Use the File Manager viewer to read the full content.\n\n"
    b"- Line four\n- Line five\n- Line six\n"
).decode()

_csv_b64 = base64.b64encode(
    b"Name,Email,Department,Salary\n"
    b"Alice,alice@example.com,Engineering,95000\n"
    b"Bob,bob@example.com,Marketing,75000\n"
    b"Carol,carol@example.com,Sales,80000\n"
    b"Dave,dave@example.com,Engineering,102000\n"
    b"Eva,eva@example.com,HR,68000\n"
).decode()

# Minimal 8x8 green PNG (valid image, tiny size)
_png_b64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAS0lEQVQoU2Nk"
    "IIDQ/////wz/GQiAAKg4sQoYGBgYGBiIVcGAgYGBgYGBiJUMDAwMDAwMJCsg"
    "BhYWFhYWFhawABUmVgUjAgAYLBEJ0QIKRAAAAABJRU5ErkJggg=="
)

_FILE_LIST: list[dict] = [
    {
        "id": 1,
        "name": "readme.txt",
        "mime_type": "text/plain",
        "size": 142,
        "description": "Project readme and notes",
        "tags": ["docs", "readme"],
        "uploaded": "2025-11-01",
        "content_base64": _txt_b64,
    },
    {
        "id": 2,
        "name": "employees.csv",
        "mime_type": "text/csv",
        "size": 185,
        "description": "Employee list export",
        "tags": ["hr", "data", "export"],
        "uploaded": "2025-12-15",
        "content_base64": _csv_b64,
    },
    {
        "id": 3,
        "name": "logo.png",
        "mime_type": "image/png",
        "size": 256,
        "description": "Company logo placeholder",
        "tags": ["image", "brand"],
        "uploaded": "2026-01-10",
        "content_base64": _png_b64,
    },
]

_next_id = 4

# ── Pydantic models ───────────────────────────────────────────────────────────
class FileUpload(BaseModel):
    name:           str
    mime_type:      str
    size:           int
    description:    str = ""
    tags:           List[str] = []
    uploaded:       str
    content_base64: str

class FileUpdate(BaseModel):
    description: str
    tags:        List[str]

# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/")
def list_files(_user: dict = Depends(get_current_user)) -> list[dict]:
    """Return all files without the content_base64 field (keep responses light)."""
    return [{k: v for k, v in f.items() if k != "content_base64"} for f in _FILE_LIST]


@router.get("/{file_id}")
def get_file(file_id: int, _user: dict = Depends(get_current_user)) -> dict:
    """Return a single file including content_base64 for the viewer."""
    for f in _FILE_LIST:
        if f["id"] == file_id:
            return f
    raise HTTPException(status_code=404, detail="File not found")


@router.post("/", status_code=201)
def upload_file(body: FileUpload, _user: dict = Depends(get_current_user)) -> dict:
    global _next_id
    new_file = {
        "id":             _next_id,
        "name":           body.name,
        "mime_type":      body.mime_type,
        "size":           body.size,
        "description":    body.description,
        "tags":           body.tags,
        "uploaded":       body.uploaded,
        "content_base64": body.content_base64,
    }
    _FILE_LIST.append(new_file)
    _next_id += 1
    return new_file


@router.put("/{file_id}")
def update_file(file_id: int, body: FileUpdate, _user: dict = Depends(get_current_user)) -> dict:
    for f in _FILE_LIST:
        if f["id"] == file_id:
            f["description"] = body.description
            f["tags"]        = body.tags
            return {k: v for k, v in f.items() if k != "content_base64"}
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: int, _user: dict = Depends(get_current_user)) -> None:
    global _FILE_LIST
    original_len = len(_FILE_LIST)
    _FILE_LIST = [f for f in _FILE_LIST if f["id"] != file_id]
    if len(_FILE_LIST) == original_len:
        raise HTTPException(status_code=404, detail="File not found")
