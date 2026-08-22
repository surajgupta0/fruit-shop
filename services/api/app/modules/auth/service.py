from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.modules.auth.models import OtpCode, RefreshToken, User, UserRole
from app.modules.auth.notifications import send_otp_notification
from app.modules.auth.schemas import TokenPair, UserResponse
from app.modules.auth.security import (
    create_access_token,
    generate_otp,
    generate_refresh_token,
    hash_token,
    permissions_for_role,
    verify_password,
)

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _token_pair(user: User, settings: Settings, refresh_plain: str) -> TokenPair:
    role = user.role.value
    access = create_access_token(
        user_id=user.id,
        email=user.email,
        role=role,
        settings=settings,
        permissions=permissions_for_role(role),
    )
    return TokenPair(
        access_token=access,
        refresh_token=refresh_plain,
        expires_in=settings.JWT_ACCESS_TTL_MINUTES * 60,
    )


def to_user_response(user: User) -> UserResponse:
    role = user.role.value
    return UserResponse(
        id=user.id,
        phone=user.phone,
        email=user.email,
        name=user.name,
        role=role,
        is_active=user.is_active,
        permissions=permissions_for_role(role),
        created_at=user.created_at,
        updated_at=getattr(user, "updated_at", None),
    )


async def request_otp(phone: str, settings: Settings, session: AsyncSession) -> None:
    code = generate_otp(settings.OTP_LENGTH)
    expires_at = _utcnow() + timedelta(minutes=settings.OTP_TTL_MINUTES)

    session.add(
        OtpCode(
            phone=phone,
            code_hash=hash_token(code),
            expires_at=expires_at,
        )
    )
    await session.flush()

    await send_otp_notification(phone=phone, code=code)
    logger.info("otp_requested phone=%s", phone)


async def verify_otp(
    phone: str,
    code: str,
    settings: Settings,
    session: AsyncSession,
) -> TokenPair:
    code_hash = hash_token(code)
    now = _utcnow()

    result = await session.execute(
        select(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .order_by(OtpCode.expires_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if otp is None or otp.code_hash != code_hash or _as_utc(otp.expires_at) < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    otp.consumed = True

    result = await session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone,
            name=f"User {phone[-4:]}",
            role=UserRole.customer,
        )
        session.add(user)
        await session.flush()

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="User is inactive")

    refresh_plain = generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
    )
    await session.flush()
    return _token_pair(user, settings, refresh_plain)


async def login(
    email: str,
    password: str,
    settings: Settings,
    session: AsyncSession,
) -> TokenPair:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if (
        user is None
        or user.password_hash is None
        or not verify_password(password, user.password_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.role not in (UserRole.admin, UserRole.staff):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Password login is restricted to admin/staff",
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="User is inactive")

    refresh_plain = generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=_utcnow() + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
    )
    await session.flush()
    return _token_pair(user, settings, refresh_plain)


async def refresh(
    refresh_token: str,
    settings: Settings,
    session: AsyncSession,
) -> TokenPair:
    token_hash = hash_token(refresh_token)
    now = _utcnow()

    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked or _as_utc(stored.expires_at) < now:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )

    stored.revoked = True
    result = await session.execute(select(User).where(User.id == stored.user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")

    refresh_plain = generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
    )
    await session.flush()
    return _token_pair(user, settings, refresh_plain)


async def get_me(user_id: str, session: AsyncSession) -> UserResponse:
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid user") from exc

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return to_user_response(user)
