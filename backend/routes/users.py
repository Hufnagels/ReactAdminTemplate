"""
routes/users.py
─────────────────────────────────────────────────────────────────────────────
Purpose : FastAPI router for user management and profile endpoints.
          Handles CRUD for the user list and per-user profile overrides.

Used by : main.py (mounted under /users prefix)
Imports : SECRET_KEY, ALGORITHM, MOCK_USERS from routes/auth.py

Key variables
  _USER_LIST        – mutable in-memory list of user dicts (10 seed users)
  _next_user_id     – auto-increment counter for new users (starts at 11)
  PROFILE_STORE     – dict[email → profile overrides] persisted while server runs
  get_current_user  – dependency that validates the Bearer JWT and returns the user dict

Endpoints
  GET    /users/me       – returns current user merged with profile overrides
  PUT    /users/me       – updates name, email, avatar_mode, avatar_base64
  GET    /users/         – lists all users
  POST   /users/         – creates a new user
  PUT    /users/{id}     – updates a user by id
  DELETE /users/{id}     – deletes a user by id
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from .auth import SECRET_KEY, ALGORITHM, MOCK_USERS

router = APIRouter()
security = HTTPBearer()

_JOINED_DATES = [
    "2023-01-15", "2023-03-22", "2023-05-10", "2023-07-04",
    "2023-09-18", "2023-11-30", "2024-01-08", "2024-03-14",
    "2024-06-21", "2024-09-05",
]

_USER_LIST: list[dict[str, Any]] = [
    {
        "id": i + 1,
        "name": name,
        "email": f"user{i + 1}@example.com",
        "role": role,
        "status": "inactive" if i % 4 == 0 else "active",
        "joined": _JOINED_DATES[i],
    }
    for i, (name, role) in enumerate(
        [
            ("Alice Johnson", "admin"),
            ("Bob Smith", "editor"),
            ("Carol White", "viewer"),
            ("David Brown", "editor"),
            ("Eva Martinez", "viewer"),
            ("Frank Lee", "admin"),
            ("Grace Kim", "editor"),
            ("Henry Wilson", "viewer"),
            ("Iris Chen", "editor"),
            ("Jack Davis", "viewer"),
        ]
    )
]
_next_user_id = 11

# In-memory profile store (persists while server runs)
PROFILE_STORE: dict[str, dict] = {}


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_base64: Optional[str] = None
    avatar_mode: Optional[str] = None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub", "")
        user = MOCK_USERS.get(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


def _build_profile(base_user: dict) -> dict:
    """Merge base user with any saved profile overrides."""
    data = {k: v for k, v in base_user.items() if k != "password"}
    data.update(PROFILE_STORE.get(base_user["email"], {}))
    return data


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return _build_profile(current_user)


@router.put("/me")
def update_me(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    email = current_user["email"]
    store = PROFILE_STORE.setdefault(email, {})

    if body.name is not None:
        store["name"] = body.name
    if body.email is not None:
        store["email"] = body.email
    # avatar_mode / avatar_base64 are always set (may be None to clear)
    if body.avatar_mode is not None:
        store["avatar_mode"] = body.avatar_mode
        if body.avatar_mode == "letter":
            store["avatar_base64"] = None          # clear image when reverting to letter
    if body.avatar_base64 is not None:
        store["avatar_base64"] = body.avatar_base64

    return _build_profile(current_user)


@router.get("/")
def get_users(current_user: dict = Depends(get_current_user)):
    return _USER_LIST


@router.post("/")
def create_user(
    user: dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    global _next_user_id
    new_user = {**user, "id": _next_user_id}
    _next_user_id += 1
    _USER_LIST.append(new_user)
    return new_user


@router.put("/{user_id}")
def update_user(
    user_id: int,
    user: dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    for i, u in enumerate(_USER_LIST):
        if u["id"] == user_id:
            _USER_LIST[i] = {**u, **user, "id": user_id}
            return _USER_LIST[i]
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    global _USER_LIST
    before = len(_USER_LIST)
    _USER_LIST = [u for u in _USER_LIST if u["id"] != user_id]
    if len(_USER_LIST) == before:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}
