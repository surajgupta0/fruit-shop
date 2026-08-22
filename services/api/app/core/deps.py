from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fruitshop_shared.auth_deps import User
from fruitshop_shared.auth_deps import get_current_user as _shared_get_current_user
from fruitshop_shared.db import get_session

from app.core.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    return _shared_get_current_user(credentials, settings)  # type: ignore[arg-type]


def require_roles(*roles: str):
    """Dependency factory: user must have at least one of the given roles."""

    def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if not set(roles) & set(user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(roles)}",
            )
        return user

    return _checker


def require_permissions(*permissions: str):
    """Dependency factory: user must have all listed permissions."""

    def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        user_perms = set(getattr(user, "permissions", []) or [])
        missing = [p for p in permissions if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return user

    return _checker


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if "admin" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user


__all__ = [
    "User",
    "get_session",
    "get_current_user",
    "require_admin",
    "require_roles",
    "require_permissions",
]
