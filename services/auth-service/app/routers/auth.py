from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from fruitshop_shared.mock import load_fixture
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.deps import get_current_user, get_db_session, require_admin
from app.schemas import (
    CreateStaffRequest,
    LoginRequest,
    OtpRequest,
    OtpVerify,
    RefreshRequest,
    TokenPair,
    UserResponse,
)
from app import service as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED)
async def otp_request(
    body: OtpRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> Response:
    await auth_service.request_otp(body.phone, settings, session)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/otp/verify", response_model=TokenPair)
async def otp_verify(
    body: OtpVerify,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> TokenPair:
    return await auth_service.verify_otp(body.phone, body.code, settings, session)


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> TokenPair:
    return await auth_service.login(body.email, body.password, settings, session)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> TokenPair:
    return await auth_service.refresh(body.refresh_token, settings, session)


@router.get("/me", response_model=UserResponse)
async def me(
    user: Annotated[AuthUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> UserResponse:
    if settings.MOCK_MODE:
        from fastapi import HTTPException

        fixtures = load_fixture("auth-service", "users.json")
        if not isinstance(fixtures, dict):
            raise HTTPException(status_code=500, detail="Invalid users fixture")
        for record in fixtures.values():
            if str(record["id"]) == user.sub:
                return UserResponse(
                    id=record["id"],
                    phone=record["phone"],
                    email=record.get("email"),
                    name=record["name"],
                    role=record["role"],
                    is_active=record.get("is_active", True),
                    created_at=record.get("created_at"),
                )
        raise HTTPException(status_code=404, detail="User not found")
    return await auth_service.get_me_from_db(user.sub, settings, session)


@router.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_staff(
    body: CreateStaffRequest,
    _: Annotated[AuthUser, Depends(require_admin)],
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db_session)],
) -> UserResponse:
    return await auth_service.create_staff_user(body, settings, session)
