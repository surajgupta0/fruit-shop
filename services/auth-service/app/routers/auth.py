from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
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
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    await auth_service.request_otp(body.phone, settings, session)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/otp/verify", response_model=TokenPair)
async def otp_verify(
    body: OtpVerify,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.verify_otp(body.phone, body.code, settings, session)


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.login(body.email, body.password, settings, session)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.refresh(body.refresh_token, settings, session)


@router.get("/me", response_model=UserResponse)
async def me(
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    return await auth_service.get_me(user.sub, session)


@router.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_staff(
    body: CreateStaffRequest,
    _: Annotated[AuthUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    return await auth_service.create_staff_user(body, session)
