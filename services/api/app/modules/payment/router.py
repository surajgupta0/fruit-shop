from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.deps import get_current_user, get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.payment import service as payment_service
from app.modules.payment.schemas import (
    PaymentConfirmRequest,
    PaymentRefundRequest,
    PaymentResponse,
)
from app.modules.users.rbac import ORDERS_MANAGE, ORDERS_READ

router = APIRouter(prefix="/payments", tags=["payment"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="payment")


@router.get("/order/{order_id}", response_model=PaymentResponse)
async def get_payment_for_order(
    order_id: UUID,
    user: Annotated[AuthUser, Depends(require_permissions(ORDERS_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PaymentResponse:
    return await payment_service.get_payment_for_order(
        user.sub, str(order_id), session
    )


@router.post("/order/{order_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    order_id: UUID,
    body: PaymentConfirmRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PaymentResponse:
    return await payment_service.confirm_payment(
        user.sub,
        str(order_id),
        body,
        session,
        actor_id=user.sub,
        settings=settings,
    )


@router.post(
    "/order/{order_id}/refund",
    response_model=PaymentResponse,
    status_code=status.HTTP_200_OK,
)
async def refund_payment_admin(
    order_id: UUID,
    body: PaymentRefundRequest,
    user: Annotated[AuthUser, Depends(require_permissions(ORDERS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PaymentResponse:
    return await payment_service.refund_payment_admin(
        str(order_id),
        session,
        reason=body.reason,
        actor_id=user.sub,
        settings=settings,
    )
