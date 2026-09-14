from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.email_notifications import send_email_otp
from app.modules.auth.models import OtpChannel, OtpCode, RefreshToken, User, UserRole
from app.modules.auth.notifications import send_otp_notification
from app.modules.auth.schemas import TokenPair
from app.modules.auth.security import (
    create_access_token,
    generate_otp,
    generate_refresh_token,
    hash_token,
    verify_password,
)

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _issue_tokens(user: User, settings: Settings, session: AsyncSession) -> TokenPair:
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="User is inactive")

    refresh_plain = generate_refresh_token()
    token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_plain),
        expires_at=_utcnow() + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
    )
    stamp_create(token, user.id)
    session.add(token)
    await session.flush()

    role = user.role.value
    return TokenPair(
        access_token=create_access_token(
            user_id=user.id,
            email=user.email,
            role=role,
            settings=settings,
        ),
        refresh_token=refresh_plain,
        expires_in=settings.JWT_ACCESS_TTL_MINUTES * 60,
    )


async def _store_otp(
    *,
    channel: OtpChannel,
    phone: str | None,
    email: str | None,
    settings: Settings,
    session: AsyncSession,
) -> str:
    static = settings.static_otp_code
    code = static if static is not None else generate_otp(settings.OTP_LENGTH)
    otp = OtpCode(
        channel=channel,
        phone=phone,
        email=email,
        code_hash=hash_token(code),
        expires_at=_utcnow() + timedelta(minutes=settings.OTP_TTL_MINUTES),
    )
    stamp_create(otp, None)
    session.add(otp)
    await session.flush()
    return code


async def _consume_otp(
    *,
    channel: OtpChannel,
    phone: str | None,
    email: str | None,
    code: str,
    session: AsyncSession,
) -> None:
    now = _utcnow()
    query = (
        select(OtpCode)
        .where(
            OtpCode.channel == channel,
            OtpCode.consumed.is_(False),
        )
        .order_by(OtpCode.expires_at.desc())
        .limit(1)
    )
    if channel == OtpChannel.phone:
        query = query.where(OtpCode.phone == phone)
    else:
        query = query.where(OtpCode.email == email)

    result = await session.execute(query)
    otp = result.scalar_one_or_none()
    if otp is None or otp.code_hash != hash_token(code) or _as_utc(otp.expires_at) < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    otp.consumed = True
    stamp_update(otp, None)


async def request_otp(phone: str, settings: Settings, session: AsyncSession) -> None:
    code = await _store_otp(
        channel=OtpChannel.phone,
        phone=phone,
        email=None,
        settings=settings,
        session=session,
    )
    if settings.use_static_otp:
        logger.info(
            "otp_static_mode phone=%s env=%s (SMS not sent; use OTP_STATIC_CODE)",
            phone,
            settings.ENVIRONMENT,
        )
    else:
        await send_otp_notification(phone=phone, code=code)
        logger.info("otp_requested phone=%s", phone)


async def request_email_otp(email: str, settings: Settings, session: AsyncSession) -> None:
    normalized = _normalize_email(email)
    code = await _store_otp(
        channel=OtpChannel.email,
        phone=None,
        email=normalized,
        settings=settings,
        session=session,
    )
    if settings.use_static_otp:
        logger.info(
            "otp_static_mode email=%s env=%s (email not sent; use OTP_STATIC_CODE)",
            normalized,
            settings.ENVIRONMENT,
        )
    else:
        await send_email_otp(to=normalized, code=code, settings=settings)
        logger.info("email_otp_requested email=%s", normalized)


async def verify_otp(
    phone: str,
    code: str,
    settings: Settings,
    session: AsyncSession,
    *,
    name: str | None = None,
) -> TokenPair:
    await _consume_otp(
        channel=OtpChannel.phone,
        phone=phone,
        email=None,
        code=code,
        session=session,
    )

    result = await session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        display_name = name.strip() if name and name.strip() else f"User {phone[-4:]}"
        user = User(phone=phone, name=display_name, role=UserRole.customer)
        session.add(user)
        await session.flush()
        stamp_create(user, user.id)
        await session.flush()
    elif name and name.strip():
        user.name = name.strip()
        stamp_update(user, user.id)

    return await _issue_tokens(user, settings, session)


async def verify_email_otp(
    email: str,
    code: str,
    settings: Settings,
    session: AsyncSession,
    *,
    name: str | None = None,
) -> TokenPair:
    normalized = _normalize_email(email)
    await _consume_otp(
        channel=OtpChannel.email,
        phone=None,
        email=normalized,
        code=code,
        session=session,
    )

    result = await session.execute(select(User).where(User.email == normalized))
    user = result.scalar_one_or_none()
    if user is None:
        local = normalized.split("@", 1)[0]
        display_name = name.strip() if name and name.strip() else local.replace(".", " ").title()
        user = User(email=normalized, name=display_name, role=UserRole.customer)
        session.add(user)
        await session.flush()
        stamp_create(user, user.id)
        await session.flush()
    elif name and name.strip():
        user.name = name.strip()
        stamp_update(user, user.id)

    return await _issue_tokens(user, settings, session)


async def login(
    email: str,
    password: str,
    settings: Settings,
    session: AsyncSession,
) -> TokenPair:
    result = await session.execute(select(User).where(User.email == _normalize_email(email)))
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
    return await _issue_tokens(user, settings, session)


async def refresh(
    refresh_token: str,
    settings: Settings,
    session: AsyncSession,
) -> TokenPair:
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token))
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked or _as_utc(stored.expires_at) < _utcnow():
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )

    stored.revoked = True
    stamp_update(stored, stored.user_id)

    result = await session.execute(select(User).where(User.id == stored.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return await _issue_tokens(user, settings, session)
