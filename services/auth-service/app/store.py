"""In-memory stores used when MOCK_MODE=true."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.models import UserRole


@dataclass
class MockUser:
    id: uuid.UUID
    phone: str
    email: str | None
    password_hash: str | None
    name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class MockOtp:
    id: uuid.UUID
    phone: str
    code_hash: str
    expires_at: datetime
    consumed: bool = False


@dataclass
class MockRefreshToken:
    id: uuid.UUID
    user_id: uuid.UUID
    token_hash: str
    expires_at: datetime
    revoked: bool = False


class MockStore:
    def __init__(self) -> None:
        self.users: dict[uuid.UUID, MockUser] = {}
        self.users_by_phone: dict[str, uuid.UUID] = {}
        self.users_by_email: dict[str, uuid.UUID] = {}
        self.otps: list[MockOtp] = []
        self.refresh_tokens: dict[str, MockRefreshToken] = {}

    def clear(self) -> None:
        self.__init__()


mock_store = MockStore()
