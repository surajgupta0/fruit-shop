from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.order.models import OrderStatus

# Allowed status transitions for professional fulfilment flow.
ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.confirmed, OrderStatus.cancelled},
    OrderStatus.confirmed: {OrderStatus.processing, OrderStatus.cancelled},
    OrderStatus.processing: {OrderStatus.shipped, OrderStatus.cancelled},
    OrderStatus.shipped: {OrderStatus.delivered},
    OrderStatus.delivered: set(),
    OrderStatus.cancelled: set(),
}

CUSTOMER_CANCELLABLE = {
    OrderStatus.pending,
    OrderStatus.confirmed,
    OrderStatus.processing,
}


def assert_transition(current: OrderStatus, target: OrderStatus) -> None:
    if current == target:
        return
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change order status from {current.value} to {target.value}",
        )


def next_actions(current: OrderStatus) -> list[OrderStatus]:
    return sorted(ALLOWED_TRANSITIONS.get(current, set()), key=lambda s: s.value)
