from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.deps import get_current_user, get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.order import service as order_service
from app.modules.order.models import OrderStatus
from app.modules.order.schemas import (
    AdminOrderUpdate,
    CancelOrderRequest,
    CheckoutRequest,
    OrderListResponse,
    OrderResponse,
)
from app.modules.users.rbac import ORDERS_MANAGE, ORDERS_READ

router = APIRouter(prefix="/orders", tags=["order"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="order")


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    body: CheckoutRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> OrderResponse:
    return await order_service.checkout(
        user.sub, body, session, actor_id=user.sub, settings=settings
    )


@router.get("", response_model=OrderListResponse)
async def list_my_orders(
    user: Annotated[AuthUser, Depends(require_permissions(ORDERS_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> OrderListResponse:
    return await order_service.list_my_orders(
        user.sub, session, page=page, page_size=page_size
    )


# ---------- admin / staff (before /{order_id}) ----------


@router.get("/admin/list", response_model=OrderListResponse)
async def list_orders_admin(
    _: Annotated[AuthUser, Depends(require_permissions(ORDERS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: OrderStatus | None = Query(None, alias="status"),
) -> OrderListResponse:
    return await order_service.list_all_orders(
        session,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
    )


@router.get("/admin/{order_id}", response_model=OrderResponse)
async def get_order_admin(
    order_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(ORDERS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrderResponse:
    return await order_service.get_order_admin(str(order_id), session)


@router.patch("/admin/{order_id}", response_model=OrderResponse)
async def update_order_admin(
    order_id: UUID,
    body: AdminOrderUpdate,
    user: Annotated[AuthUser, Depends(require_permissions(ORDERS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> OrderResponse:
    return await order_service.update_order_admin(
        str(order_id),
        body,
        session,
        actor_id=user.sub,
        settings=settings,
    )


# ---------- customer order detail ----------


@router.get("/{order_id}", response_model=OrderResponse)
async def get_my_order(
    order_id: UUID,
    user: Annotated[AuthUser, Depends(require_permissions(ORDERS_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrderResponse:
    return await order_service.get_my_order(user.sub, str(order_id), session)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_my_order(
    order_id: UUID,
    body: CancelOrderRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> OrderResponse:
    return await order_service.cancel_my_order(
        user.sub,
        str(order_id),
        session,
        reason=body.reason,
        actor_id=user.sub,
        settings=settings,
    )
