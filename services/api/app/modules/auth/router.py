from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.deps import get_session
from app.modules.auth import service as auth_service
from app.modules.auth.schemas import (
    EmailOtpRequest,
    EmailOtpVerify,
    LoginRequest,
    OtpRequest,
    OtpVerify,
    RefreshRequest,
    TokenPair,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED)
async def otp_request(
    body: OtpRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    await auth_service.request_otp(body.phone, settings, session)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/otp/verify", response_model=TokenPair)
async def otp_verify(
    body: OtpVerify,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.verify_otp(
        body.phone, body.code, settings, session, name=body.name
    )


@router.post("/otp/email/request", status_code=status.HTTP_202_ACCEPTED)
async def email_otp_request(
    body: EmailOtpRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    await auth_service.request_email_otp(body.email, settings, session)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/otp/email/verify", response_model=TokenPair)
async def email_otp_verify(
    body: EmailOtpVerify,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.verify_email_otp(
        body.email, body.code, settings, session, name=body.name
    )


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.login(body.email, body.password, settings, session)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenPair:
    return await auth_service.refresh(body.refresh_token, settings, session)
