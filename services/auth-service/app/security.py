from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import bcrypt
import jwt

from app.config import Settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def generate_otp(length: int = 6) -> str:
    upper = 10**length
    return str(secrets.randbelow(upper)).zfill(length)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(
    *,
    user_id: UUID | str,
    email: str | None,
    role: str,
    settings: Settings,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "roles": [role],
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str, settings: Settings) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
