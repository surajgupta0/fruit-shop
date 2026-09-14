from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.email_notifications import send_email_otp, send_password_reset_email
from app.modules.auth.models import (
    OtpChannel,
    OtpCode,
    PasswordResetToken,
    RefreshToken,
    User,
    UserRole,
)
from app.modules.auth.notifications import send_otp_notification
from app.modules.auth.schemas import TokenPair
from app.modules.auth.security import (
    create_access_token,
    generate_otp,
    generate_password_reset_token,
    generate_refresh_token,
    hash_password,
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


def _parse_user_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid user") from exc


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
        await send_otp_notification(phone=phone, code=code, settings=settings)
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


async def _revoke_refresh_token(refresh_token: str, session: AsyncSession) -> bool:
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token))
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        return False
    if not stored.revoked:
        stored.revoked = True
        stamp_update(stored, stored.user_id)
        await session.flush()
    return True


async def _revoke_all_refresh_tokens(user_id: uuid.UUID, session: AsyncSession) -> int:
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
    )
    tokens = list(result.scalars().all())
    for token in tokens:
        token.revoked = True
        stamp_update(token, user_id)
    if tokens:
        await session.flush()
    return len(tokens)


async def logout(
    *,
    refresh_token: str | None,
    all_sessions: bool,
    actor_id: str | None,
    session: AsyncSession,
) -> None:
    """Revoke one refresh token and/or all sessions for the authenticated user."""
    if not refresh_token and not all_sessions:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Provide refresh_token and/or all_sessions=true",
        )

    if all_sessions:
        if not actor_id:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail="Authorization required to revoke all sessions",
            )
        await _revoke_all_refresh_tokens(_parse_user_id(actor_id), session)

    if refresh_token:
        await _revoke_refresh_token(refresh_token, session)


async def request_password_reset(
    email: str,
    settings: Settings,
    session: AsyncSession,
) -> None:
    """Start password reset for admin/staff. Always succeeds (no email enumeration)."""
    normalized = _normalize_email(email)
    result = await session.execute(select(User).where(User.email == normalized))
    user = result.scalar_one_or_none()

    if (
        user is None
        or not user.is_active
        or user.password_hash is None
        or user.role not in (UserRole.admin, UserRole.staff)
    ):
        logger.info("password_reset_ignored email=%s", normalized)
        return

    # Invalidate prior unused tokens for this user
    await session.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.consumed.is_(False),
        )
        .values(consumed=True)
    )

    plain = generate_password_reset_token()
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(plain),
        expires_at=_utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES),
    )
    stamp_create(reset, user.id)
    session.add(reset)
    await session.flush()

    await send_password_reset_email(to=normalized, reset_token=plain, settings=settings)
    logger.info("password_reset_requested email=%s", normalized)


async def reset_password(
    token: str,
    new_password: str,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(token))
    )
    stored = result.scalar_one_or_none()
    if (
        stored is None
        or stored.consumed
        or _as_utc(stored.expires_at) < _utcnow()
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    if user.role not in (UserRole.admin, UserRole.staff):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Password reset not allowed")

    user.password_hash = hash_password(new_password)
    stamp_update(user, user.id)
    stored.consumed = True
    stamp_update(stored, user.id)
    await _revoke_all_refresh_tokens(user.id, session)
    await session.flush()
    logger.info("password_reset_completed user_id=%s", user.id)
