"""
routes/auth.py
─────────────────────────────────────────────────────────────────────────────
Purpose : FastAPI router for authentication. Provides the POST /auth/login
          endpoint that validates credentials against a mock user store and
          returns a signed JWT access token.

Used by : main.py (mounted under /auth prefix),
          users.py (imports SECRET_KEY, ALGORITHM, MOCK_USERS)

Key variables
  SECRET_KEY                 – HS256 signing secret (change in production)
  ALGORITHM                  – 'HS256'
  ACCESS_TOKEN_EXPIRE_MINUTES – 24 hours
  MOCK_USERS                 – dict[email → user dict] in-memory credential store;
                               exported to users.py for token verification
  LoginRequest               – Pydantic model: { email, password }
  create_access_token()      – encodes { sub: email, id, exp } into a JWT
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from jose import jwt

router = APIRouter()

SECRET_KEY = "change-this-in-production-please"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 h

# Mock user store — replace with a real DB in production
MOCK_USERS: dict[str, dict] = {
    "admin@example.com": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "password": "password123",
        "role": "admin",
    },
    "editor@example.com": {
        "id": 2,
        "name": "Editor User",
        "email": "editor@example.com",
        "password": "password123",
        "role": "editor",
    },
}


class LoginRequest(BaseModel):
    email: str
    password: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login")
def login(request: LoginRequest):
    user = MOCK_USERS.get(request.email)
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": user["email"], "id": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }
