from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fruitshop_shared.auth_deps import User as AuthUser
from fruitshop_shared.auth_deps import get_current_user as shared_get_current_user
from fruitshop_shared.db import get_session as shared_get_session
from fruitshop_shared.mock import load_fixture
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)


async def get_db_session(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncGenerator[AsyncSession | None, Any]:
    if settings.MOCK_MODE:
        yield None
        return
    async for session in shared_get_session():
        yield session


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
    """Resolve the current user; support mock-* tokens when MOCK_MODE=true."""
    if settings.MOCK_MODE:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = credentials.credentials
        if not token.startswith("mock-"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mock mode accepts only Bearer tokens starting with 'mock-'",
                headers={"WWW-Authenticate": "Bearer"},
            )
        fixtures = load_fixture("auth-service", "users.json")
        if not isinstance(fixtures, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid users fixture format",
            )
        record = fixtures.get(token)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unknown mock token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return AuthUser(
            sub=str(record["id"]),
            email=record.get("email"),
            roles=[record["role"]],
        )

    return shared_get_current_user(credentials, settings)  # type: ignore[arg-type]


def require_admin(
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> AuthUser:
    if "admin" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user
