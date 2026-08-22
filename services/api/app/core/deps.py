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


def require_permissions(*permissions: str):
    """Require all listed permissions on the JWT."""

    def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        missing = [p for p in permissions if p not in user.permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return user

    return _checker
