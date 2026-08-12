from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fruitshop_shared.auth_deps import User as AuthUser
from fruitshop_shared.auth_deps import get_current_user as shared_get_current_user
from fruitshop_shared.db import get_session as shared_get_session
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)


async def get_db_session():
    async for session in shared_get_session():
        yield session


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
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
