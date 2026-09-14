from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.deps import get_optional_user, get_session
from app.modules.auth import service as auth_service
from app.modules.auth.schemas import (
    EmailOtpRequest,
    EmailOtpVerify,
    LoginRequest,
    LogoutRequest,
    OtpRequest,
    OtpVerify,
    PasswordForgotRequest,
    PasswordResetRequest,
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


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: LogoutRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    actor: Annotated[AuthUser | None, Depends(get_optional_user)],
) -> Response:
    await auth_service.logout(
        refresh_token=body.refresh_token,
        all_sessions=body.all_sessions,
        actor_id=actor.sub if actor else None,
        session=session,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/password/forgot", status_code=status.HTTP_202_ACCEPTED)
async def password_forgot(
    body: PasswordForgotRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    await auth_service.request_password_reset(body.email, settings, session)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def password_reset(
    body: PasswordResetRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await auth_service.reset_password(body.token, body.new_password, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
