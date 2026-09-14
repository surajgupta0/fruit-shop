from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.catalog.models import ProductVariant
from app.modules.inventory import service as inventory_service
from app.modules.order.models import Order


def parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


async def get_order_or_404(order_id: str | uuid.UUID, session: AsyncSession) -> Order:
    oid = parse_uuid(order_id, label="order id")
    order = (
        await session.execute(
            select(Order)
            .where(Order.id == oid)
            .options(selectinload(Order.items))
        )
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


async def load_variant_bundle(
    variant_id: uuid.UUID, session: AsyncSession
):
    from app.modules.catalog.models import Product

    variant = (
        await session.execute(
            select(ProductVariant)
            .where(ProductVariant.id == variant_id)
            .options(selectinload(ProductVariant.product).selectinload(Product.images))
        )
    ).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return variant, variant.product


async def restore_stock(
    order: Order,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
) -> None:
    lines: list[tuple[uuid.UUID, int]] = []
    for item in order.items:
        if item.variant_id is None:
            continue
        lines.append((item.variant_id, item.quantity))
    await inventory_service.restore_order_stock(
        order.id, lines, session, actor_id=actor_id
    )
