from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.models import User, UserAddress, UserRole
from app.modules.auth.security import hash_password
from app.modules.users.models import Permission, Role
from app.modules.users.rbac import permissions_for_role
from app.modules.users.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    PermissionResponse,
    RoleResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)


def to_user_response(user: User) -> UserResponse:
    data = UserResponse.model_validate(user)
    data.role = user.role.value
    data.permissions = permissions_for_role(data.role)
    return data


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def _actor_uuid(actor_id: str | uuid.UUID | None) -> uuid.UUID | None:
    if actor_id is None:
        return None
    return _parse_uuid(actor_id, label="actor id")


async def get_user_by_id(user_id: str | uuid.UUID, session: AsyncSession) -> User:
    result = await session.execute(
        select(User).where(User.id == _parse_uuid(user_id, label="user id"))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _get_address(
    user_id: uuid.UUID,
    address_id: str | uuid.UUID,
    session: AsyncSession,
) -> UserAddress:
    result = await session.execute(
        select(UserAddress).where(
            UserAddress.id == _parse_uuid(address_id, label="address id"),
            UserAddress.user_id == user_id,
        )
    )
    address = result.scalar_one_or_none()
    if address is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Address not found")
    return address


async def _clear_default_addresses(user_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(select(UserAddress).where(UserAddress.user_id == user_id))
    for addr in result.scalars().all():
        addr.is_default = False


def assert_can_manage_user(actor_role: str, target: User) -> None:
    if actor_role == "admin":
        return
    if actor_role == "staff" and target.role == UserRole.customer:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed to manage this user")


async def list_users(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    role: str | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> UserListResponse:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    query = select(User)
    count_query = select(func.count()).select_from(User)

    if role:
        try:
            role_enum = UserRole(role)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid role") from exc
        query = query.where(User.role == role_enum)
        count_query = count_query.where(User.role == role_enum)

    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
        count_query = count_query.where(User.is_active.is_(is_active))

    if search:
        pattern = f"%{search}%"
        filt = or_(User.name.ilike(pattern), User.phone.ilike(pattern), User.email.ilike(pattern))
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await session.execute(count_query)).scalar_one()
    result = await session.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return UserListResponse(
        items=[to_user_response(u) for u in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
    )


async def create_user(
    payload: UserCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> UserResponse:
    if payload.role == UserRole.customer:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Use OTP flow to create customer accounts",
        )

    email = str(payload.email).lower()
    existing = await session.execute(
        select(User).where((User.phone == payload.phone) | (User.email == email))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Phone or email already registered")

    actor = _actor_uuid(actor_id)
    user = User(
        phone=payload.phone,
        email=email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
    )
    stamp_create(user, actor)
    session.add(user)
    await session.flush()
    return to_user_response(user)


async def update_user(
    user_id: str,
    payload: UserUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> UserResponse:
    user = await get_user_by_id(user_id, session)
    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] is not None:
        email = str(data["email"]).lower()
        clash = await session.execute(select(User).where(User.email == email, User.id != user.id))
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already in use")
        data["email"] = email

    if "phone" in data and data["phone"] is not None:
        clash = await session.execute(
            select(User).where(User.phone == data["phone"], User.id != user.id)
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Phone already in use")

    for key, value in data.items():
        setattr(user, key, value)
    stamp_update(user, _actor_uuid(actor_id))
    await session.flush()
    return to_user_response(user)


async def change_role(
    user_id: str,
    payload: UserRoleUpdate,
    actor_id: str,
    session: AsyncSession,
) -> UserResponse:
    if str(user_id) == str(actor_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role")
    user = await get_user_by_id(user_id, session)
    user.role = payload.role
    stamp_update(user, _actor_uuid(actor_id))
    await session.flush()
    return to_user_response(user)


async def set_status(
    user_id: str,
    payload: UserStatusUpdate,
    actor_id: str,
    session: AsyncSession,
) -> UserResponse:
    if str(user_id) == str(actor_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot change your own status")
    user = await get_user_by_id(user_id, session)
    user.is_active = payload.is_active
    stamp_update(user, _actor_uuid(actor_id))
    await session.flush()
    return to_user_response(user)


async def set_password(
    user_id: str,
    password: str,
    session: AsyncSession,
    *,
    actor_id: str,
) -> UserResponse:
    user = await get_user_by_id(user_id, session)
    if user.role == UserRole.customer:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Customers authenticate via OTP, not password",
        )
    user.password_hash = hash_password(password)
    stamp_update(user, _actor_uuid(actor_id))
    await session.flush()
    return to_user_response(user)


async def list_roles(session: AsyncSession) -> list[RoleResponse]:
    result = await session.execute(select(Role).order_by(Role.name))
    return [
        RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            permissions=sorted(p.code for p in role.permissions)
            or sorted(permissions_for_role(role.name)),
            created_at=role.created_at,
            updated_at=role.updated_at,
            created_by=role.created_by,
            updated_by=role.updated_by,
        )
        for role in result.scalars().all()
    ]


async def list_permissions(session: AsyncSession) -> list[PermissionResponse]:
    result = await session.execute(select(Permission).order_by(Permission.code))
    return [PermissionResponse.model_validate(p) for p in result.scalars().all()]


async def list_addresses(user_id: str, session: AsyncSession) -> list[AddressResponse]:
    user = await get_user_by_id(user_id, session)
    result = await session.execute(
        select(UserAddress)
        .where(UserAddress.user_id == user.id)
        .order_by(UserAddress.created_at.desc())
    )
    return [AddressResponse.model_validate(a) for a in result.scalars().all()]


async def add_address(
    user_id: str,
    payload: AddressCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> AddressResponse:
    user = await get_user_by_id(user_id, session)
    if payload.is_default:
        await _clear_default_addresses(user.id, session)

    actor = _actor_uuid(actor_id)
    address = UserAddress(
        user_id=user.id,
        label=payload.label,
        line1=payload.line1,
        line2=payload.line2,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        country=payload.country.upper(),
        is_default=payload.is_default,
    )
    stamp_create(address, actor)
    session.add(address)
    await session.flush()
    return AddressResponse.model_validate(address)


async def update_address(
    user_id: str,
    address_id: str,
    payload: AddressUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> AddressResponse:
    user = await get_user_by_id(user_id, session)
    address = await _get_address(user.id, address_id, session)
    data = payload.model_dump(exclude_unset=True)

    if data.get("is_default"):
        await _clear_default_addresses(user.id, session)
    if data.get("country"):
        data["country"] = data["country"].upper()

    for key, value in data.items():
        setattr(address, key, value)
    stamp_update(address, _actor_uuid(actor_id))
    await session.flush()
    return AddressResponse.model_validate(address)


async def delete_address(
    user_id: str,
    address_id: str,
    session: AsyncSession,
) -> None:
    user = await get_user_by_id(user_id, session)
    address = await _get_address(user.id, address_id, session)
    await session.delete(address)
    await session.flush()
