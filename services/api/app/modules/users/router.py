from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_session, require_permissions
from app.modules.users import rbac
from app.modules.users import service as users_service
from app.modules.users.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    PermissionResponse,
    RoleResponse,
    UserCreate,
    UserListResponse,
    UserPasswordUpdate,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])


def _forbid(permission: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Missing permission: {permission}",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_READ_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    db_user = await users_service.get_user_by_id(user.sub, session)
    return users_service.to_user_response(db_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    return await users_service.update_user(user.sub, body, session)


@router.get("/me/addresses", response_model=list[AddressResponse])
async def list_my_addresses(
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_READ_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AddressResponse]:
    return await users_service.list_addresses(user.sub, session)


@router.post(
    "/me/addresses",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_my_address(
    body: AddressCreate,
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AddressResponse:
    return await users_service.add_address(user.sub, body, session)


@router.patch("/me/addresses/{address_id}", response_model=AddressResponse)
async def update_my_address(
    address_id: UUID,
    body: AddressUpdate,
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AddressResponse:
    return await users_service.update_address(user.sub, str(address_id), body, session)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_address(
    address_id: UUID,
    user: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE_SELF))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await users_service.delete_address(user.sub, str(address_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=UserListResponse)
async def list_users(
    _: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_LIST))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> UserListResponse:
    return await users_service.list_users(
        session,
        page=page,
        page_size=page_size,
        role=role,
        is_active=is_active,
        search=search,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    return await users_service.create_user(body, session)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    actor: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    is_self = str(user_id) == actor.sub
    if is_self:
        if rbac.USERS_READ_SELF not in actor.permissions:
            _forbid(rbac.USERS_READ_SELF)
    else:
        if rbac.USERS_READ not in actor.permissions:
            _forbid(rbac.USERS_READ)

    db_user = await users_service.get_user_by_id(str(user_id), session)
    if not is_self:
        actor_role = actor.roles[0] if actor.roles else ""
        users_service.assert_can_manage_user(actor_role, db_user)
    return users_service.to_user_response(db_user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    db_user = await users_service.get_user_by_id(str(user_id), session)
    actor_role = actor.roles[0] if actor.roles else ""
    users_service.assert_can_manage_user(actor_role, db_user)
    return await users_service.update_user(str(user_id), body, session)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def change_role(
    user_id: UUID,
    body: UserRoleUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_CHANGE_ROLE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    return await users_service.change_role(str(user_id), body, actor.sub, session)


@router.patch("/{user_id}/status", response_model=UserResponse)
async def set_status(
    user_id: UUID,
    body: UserStatusUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_DEACTIVATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    return await users_service.set_status(str(user_id), body, actor.sub, session)


@router.patch("/{user_id}/password", response_model=UserResponse)
async def set_password(
    user_id: UUID,
    body: UserPasswordUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(rbac.USERS_UPDATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    db_user = await users_service.get_user_by_id(str(user_id), session)
    actor_role = actor.roles[0] if actor.roles else ""
    users_service.assert_can_manage_user(actor_role, db_user)
    return await users_service.set_password(str(user_id), body.password, session)


@roles_router.get("", response_model=list[RoleResponse])
async def list_roles(
    _: Annotated[AuthUser, Depends(require_permissions(rbac.ROLES_LIST))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[RoleResponse]:
    return await users_service.list_roles(session)


@roles_router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    _: Annotated[AuthUser, Depends(require_permissions(rbac.ROLES_LIST))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PermissionResponse]:
    perms = await users_service.list_permissions(session)
    return [
        PermissionResponse(id=p.id, code=p.code, description=p.description) for p in perms
    ]
