from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.mixins import stamp_update
from app.modules.order.helpers import get_order_or_404, restore_stock
from app.modules.order.models import Order, OrderStatus, PaymentMethod, PaymentStatus
from app.modules.payment.models import Payment
from app.modules.payment.schemas import PaymentConfirmRequest, PaymentResponse


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_payment_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse.model_validate(payment)


async def get_payment_for_order(
    user_id: str,
    order_id: str,
    session: AsyncSession,
    *,
    admin: bool = False,
) -> PaymentResponse:
    oid = _parse_uuid(order_id, label="order id")
    order = (
        await session.execute(select(Order).where(Order.id == oid))
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not admin and order.user_id != _parse_uuid(user_id, label="user id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")

    payment = (
        await session.execute(select(Payment).where(Payment.order_id == oid))
    ).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return _to_payment_response(payment)


async def confirm_payment(
    user_id: str,
    order_id: str,
    body: PaymentConfirmRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> PaymentResponse:
    oid = _parse_uuid(order_id, label="order id")
    uid = _parse_uuid(user_id, label="user id")
    aid = _parse_uuid(actor_id) if actor_id else uid

    order = (
        await session.execute(select(Order).where(Order.id == oid))
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.user_id != uid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")
    if order.payment_method != PaymentMethod.online:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Only online orders can be confirmed via payment",
        )
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Order is cancelled")

    payment = (
        await session.execute(select(Payment).where(Payment.order_id == oid))
    ).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.status == PaymentStatus.paid:
        return _to_payment_response(payment)

    payment.status = PaymentStatus.paid
    payment.paid_at = _utcnow()
    payment.provider = payment.provider or "stub"
    payment.provider_reference = body.provider_reference
    stamp_update(payment, aid)

    order.payment_status = PaymentStatus.paid
    if order.status == OrderStatus.pending:
        order.status = OrderStatus.confirmed
    stamp_update(order, aid)

    await session.flush()
    return _to_payment_response(payment)


async def refund_payment_admin(
    order_id: str,
    session: AsyncSession,
    *,
    reason: str | None = None,
    actor_id: str | uuid.UUID | None = None,
) -> PaymentResponse:
    oid = _parse_uuid(order_id, label="order id")
    aid = _parse_uuid(actor_id) if actor_id else None

    order = await get_order_or_404(order_id, session)
    payment = (
        await session.execute(select(Payment).where(Payment.order_id == oid))
    ).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.status != PaymentStatus.paid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Payment is not paid")

    payment.status = PaymentStatus.refunded
    payment.failure_reason = reason
    stamp_update(payment, aid)

    order.payment_status = PaymentStatus.refunded
    if order.status not in (OrderStatus.cancelled, OrderStatus.delivered):
        await restore_stock(order, session, actor_id=aid)
        order.status = OrderStatus.cancelled
        order.cancel_reason = reason or "Refunded"
        order.cancelled_at = _utcnow()
    stamp_update(order, aid)

    await session.flush()
    return _to_payment_response(payment)
