from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User, UserAddress, UserRole
from app.modules.auth.security import hash_password, permissions_for_role
from app.modules.users.models import Permission, Role
from app.modules.users.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    RoleResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
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


def to_address_response(address: UserAddress) -> AddressResponse:
    return AddressResponse(
        id=address.id,
        label=address.label,
        line1=address.line1,
        line2=address.line2,
        city=address.city,
        state=address.state,
        postal_code=address.postal_code,
        country=address.country,
        is_default=address.is_default,
        created_at=address.created_at,
    )


async def get_user_by_id(user_id: str | uuid.UUID, session: AsyncSession) -> User:
    try:
        uid = uuid.UUID(str(user_id))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


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
        filt = or_(
            User.name.ilike(pattern),
            User.phone.ilike(pattern),
            User.email.ilike(pattern),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await session.execute(count_query)).scalar_one()
    result = await session.execute(
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = result.scalars().all()
    return UserListResponse(
        items=[to_user_response(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


async def create_user(payload: UserCreate, session: AsyncSession) -> UserResponse:
    if payload.role == UserRole.customer:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Use OTP flow to create customer accounts",
        )

    existing = await session.execute(
        select(User).where(
            (User.phone == payload.phone) | (User.email == str(payload.email).lower())
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Phone or email already registered"
        )

    user = User(
        phone=payload.phone,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=UserRole(payload.role.value),
    )
    session.add(user)
    await session.flush()
    return to_user_response(user)


async def update_user(
    user_id: str,
    payload: UserUpdate,
    session: AsyncSession,
) -> UserResponse:
    user = await get_user_by_id(user_id, session)

    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        email = str(payload.email).lower()
        clash = await session.execute(
            select(User).where(User.email == email, User.id != user.id)
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = email
    if payload.phone is not None:
        clash = await session.execute(
            select(User).where(User.phone == payload.phone, User.id != user.id)
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Phone already in use")
        user.phone = payload.phone

    await session.flush()
    return to_user_response(user)


async def change_role(
    user_id: str,
    payload: UserRoleUpdate,
    actor_id: str,
    session: AsyncSession,
) -> UserResponse:
    if str(user_id) == str(actor_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role"
        )

    user = await get_user_by_id(user_id, session)
    user.role = UserRole(payload.role.value)
    await session.flush()
    return to_user_response(user)


async def set_status(
    user_id: str,
    payload: UserStatusUpdate,
    actor_id: str,
    session: AsyncSession,
) -> UserResponse:
    if str(user_id) == str(actor_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Cannot change your own status"
        )

    user = await get_user_by_id(user_id, session)
    user.is_active = payload.is_active
    await session.flush()
    return to_user_response(user)


async def set_password(
    user_id: str,
    password: str,
    session: AsyncSession,
) -> UserResponse:
    user = await get_user_by_id(user_id, session)
    if user.role == UserRole.customer:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Customers authenticate via OTP, not password",
        )
    user.password_hash = hash_password(password)
    await session.flush()
    return to_user_response(user)


async def list_roles(session: AsyncSession) -> list[RoleResponse]:
    result = await session.execute(select(Role).order_by(Role.name))
    roles = result.scalars().all()
    out: list[RoleResponse] = []
    for role in roles:
        perms = [p.code for p in role.permissions]
        if not perms:
            perms = permissions_for_role(role.name)
        out.append(
            RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                permissions=sorted(perms),
            )
        )
    return out


async def list_permissions(session: AsyncSession) -> list[Permission]:
    result = await session.execute(select(Permission).order_by(Permission.code))
    return list(result.scalars().all())


async def list_addresses(user_id: str, session: AsyncSession) -> list[AddressResponse]:
    user = await get_user_by_id(user_id, session)
    result = await session.execute(
        select(UserAddress)
        .where(UserAddress.user_id == user.id)
        .order_by(UserAddress.created_at.desc())
    )
    return [to_address_response(a) for a in result.scalars().all()]


async def add_address(
    user_id: str,
    payload: AddressCreate,
    session: AsyncSession,
) -> AddressResponse:
    user = await get_user_by_id(user_id, session)

    if payload.is_default:
        result = await session.execute(
            select(UserAddress).where(UserAddress.user_id == user.id)
        )
        for addr in result.scalars().all():
            addr.is_default = False

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
    session.add(address)
    await session.flush()
    return to_address_response(address)


async def update_address(
    user_id: str,
    address_id: str,
    payload: AddressUpdate,
    session: AsyncSession,
) -> AddressResponse:
    user = await get_user_by_id(user_id, session)
    try:
        aid = uuid.UUID(address_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid address id") from exc

    result = await session.execute(
        select(UserAddress).where(
            UserAddress.id == aid, UserAddress.user_id == user.id
        )
    )
    address = result.scalar_one_or_none()
    if address is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Address not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_default"):
        existing = await session.execute(
            select(UserAddress).where(UserAddress.user_id == user.id)
        )
        for addr in existing.scalars().all():
            addr.is_default = False
    if "country" in data and data["country"]:
        data["country"] = data["country"].upper()

    for key, value in data.items():
        setattr(address, key, value)

    await session.flush()
    return to_address_response(address)


async def delete_address(user_id: str, address_id: str, session: AsyncSession) -> None:
    user = await get_user_by_id(user_id, session)
    try:
        aid = uuid.UUID(address_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid address id") from exc

    result = await session.execute(
        select(UserAddress).where(
            UserAddress.id == aid, UserAddress.user_id == user.id
        )
    )
    address = result.scalar_one_or_none()
    if address is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Address not found")
    await session.delete(address)
    await session.flush()


def assert_can_manage_user(actor_role: str, target: User) -> None:
    """Staff can only manage customers; admin can manage anyone except elevating beyond rules elsewhere."""
    if actor_role == "admin":
        return
    if actor_role == "staff" and target.role == UserRole.customer:
        return
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        detail="Not allowed to manage this user",
    )


# Re-export helpers used by router
__all__ = [
    "add_address",
    "assert_can_manage_user",
    "change_role",
    "create_user",
    "delete_address",
    "get_user_by_id",
    "list_addresses",
    "list_permissions",
    "list_roles",
    "list_users",
    "set_password",
    "set_status",
    "to_user_response",
    "update_address",
    "update_user",
]
