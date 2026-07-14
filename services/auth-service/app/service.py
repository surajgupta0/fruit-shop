from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import OtpCode, RefreshToken, User, UserRole
from app.notifications import send_otp_notification
from app.schemas import CreateStaffRequest, TokenPair, UserResponse
from app.security import (
    create_access_token,
    generate_otp,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.store import MockOtp, MockRefreshToken, MockUser, mock_store

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _token_pair(user: User | MockUser, settings: Settings, refresh_plain: str) -> TokenPair:
    access = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
        settings=settings,
    )
    return TokenPair(
        access_token=access,
        refresh_token=refresh_plain,
        expires_in=settings.JWT_ACCESS_TTL_MINUTES * 60,
    )


def _to_user_response(user: User | MockUser) -> UserResponse:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    return UserResponse(
        id=user.id,
        phone=user.phone,
        email=user.email,
        name=user.name,
        role=role,
        is_active=user.is_active,
        created_at=getattr(user, "created_at", None),
    )


async def request_otp(
    phone: str,
    settings: Settings,
    session: AsyncSession | None,
) -> None:
    code = settings.MOCK_OTP if settings.MOCK_MODE else generate_otp(settings.OTP_LENGTH)
    code_hash = hash_token(code)
    expires_at = _utcnow() + timedelta(minutes=settings.OTP_TTL_MINUTES)

    if settings.MOCK_MODE:
        mock_store.otps.append(
            MockOtp(
                id=uuid.uuid4(),
                phone=phone,
                code_hash=code_hash,
                expires_at=expires_at,
            )
        )
    else:
        assert session is not None
        session.add(
            OtpCode(
                phone=phone,
                code_hash=code_hash,
                expires_at=expires_at,
            )
        )
        await session.flush()

    await send_otp_notification(phone=phone, code=code, settings=settings)
    logger.info("otp_requested", extra={"phone": phone, "mock": settings.MOCK_MODE})


async def verify_otp(
    phone: str,
    code: str,
    settings: Settings,
    session: AsyncSession | None,
) -> TokenPair:
    code_hash = hash_token(code)
    now = _utcnow()

    if settings.MOCK_MODE:
        otp = next(
            (
                o
                for o in reversed(mock_store.otps)
                if o.phone == phone and not o.consumed
            ),
            None,
        )
        if otp is None or otp.code_hash != code_hash or otp.expires_at < now:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")
        otp.consumed = True

        user_id = mock_store.users_by_phone.get(phone)
        if user_id is None:
            user = MockUser(
                id=uuid.uuid4(),
                phone=phone,
                email=None,
                password_hash=None,
                name=f"User {phone[-4:]}",
                role=UserRole.customer,
            )
            mock_store.users[user.id] = user
            mock_store.users_by_phone[phone] = user.id
        else:
            user = mock_store.users[user_id]

        refresh_plain = generate_refresh_token()
        mock_store.refresh_tokens[hash_token(refresh_plain)] = MockRefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
        return _token_pair(user, settings, refresh_plain)

    assert session is not None
    result = await session.execute(
        select(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .order_by(OtpCode.expires_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if otp is None or otp.code_hash != code_hash or otp.expires_at < now:
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
    session: AsyncSession | None,
) -> TokenPair:
    now = _utcnow()

    if settings.MOCK_MODE:
        user_id = mock_store.users_by_email.get(email.lower())
        user = mock_store.users.get(user_id) if user_id else None
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
        mock_store.refresh_tokens[hash_token(refresh_plain)] = MockRefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
        return _token_pair(user, settings, refresh_plain)

    assert session is not None
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
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
    )
    await session.flush()
    return _token_pair(user, settings, refresh_plain)


async def refresh(
    refresh_token: str,
    settings: Settings,
    session: AsyncSession | None,
) -> TokenPair:
    token_hash = hash_token(refresh_token)
    now = _utcnow()

    if settings.MOCK_MODE:
        stored = mock_store.refresh_tokens.get(token_hash)
        if stored is None or stored.revoked or stored.expires_at < now:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
            )
        stored.revoked = True
        user = mock_store.users.get(stored.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")

        refresh_plain = generate_refresh_token()
        mock_store.refresh_tokens[hash_token(refresh_plain)] = MockRefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(refresh_plain),
            expires_at=now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        )
        return _token_pair(user, settings, refresh_plain)

    assert session is not None
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked or stored.expires_at < now:
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


async def get_me_from_db(
    user_id: str,
    settings: Settings,
    session: AsyncSession | None,
) -> UserResponse:
    if settings.MOCK_MODE:
        try:
            uid = uuid.UUID(user_id)
        except ValueError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid user") from exc
        user = mock_store.users.get(uid)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
        return _to_user_response(user)

    assert session is not None
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid user") from exc

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_user_response(user)


async def create_staff_user(
    payload: CreateStaffRequest,
    settings: Settings,
    session: AsyncSession | None,
) -> UserResponse:
    if payload.role.value == UserRole.customer.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Admin endpoint cannot create customer accounts",
        )

    if settings.MOCK_MODE:
        if payload.phone in mock_store.users_by_phone:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Phone already registered")
        if payload.email.lower() in mock_store.users_by_email:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")

        user = MockUser(
            id=uuid.uuid4(),
            phone=payload.phone,
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            name=payload.name,
            role=UserRole(payload.role.value),
        )
        mock_store.users[user.id] = user
        mock_store.users_by_phone[user.phone] = user.id
        mock_store.users_by_email[user.email] = user.id
        return _to_user_response(user)

    assert session is not None
    existing = await session.execute(
        select(User).where((User.phone == payload.phone) | (User.email == payload.email))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Phone or email already registered")

    user = User(
        phone=payload.phone,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=UserRole(payload.role.value),
    )
    session.add(user)
    await session.flush()
    return _to_user_response(user)
