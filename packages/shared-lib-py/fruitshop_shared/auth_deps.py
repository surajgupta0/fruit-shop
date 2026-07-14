from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from fruitshop_shared.settings import BaseAppSettings

_bearer = HTTPBearer(auto_error=False)


class User(BaseModel):
    """Authenticated user extracted from a JWT."""

    sub: str
    email: str | None = None
    roles: list[str] = Field(default_factory=list)


def get_settings() -> BaseAppSettings:
    """Default settings provider; services should override via FastAPI Depends."""
    return BaseAppSettings()


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
    settings: Annotated[BaseAppSettings, Depends(get_settings)],
) -> User:
    """Decode the Bearer JWT and return a User, or raise 401."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    roles = payload.get("roles", [])
    if isinstance(roles, str):
        roles = [roles]

    return User(
        sub=str(sub),
        email=payload.get("email"),
        roles=list(roles),
    )
