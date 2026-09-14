from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.models import User, UserAddress
from app.modules.cart.models import Cart
from app.modules.cart import service as cart_service
from app.modules.catalog.models import Product, ProductVariant
from app.modules.order.helpers import get_order_or_404, parse_uuid, restore_stock
from app.modules.order.models import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.modules.order.pricing import (
    CURRENCY,
    assert_purchasable,
    cart_totals,
    price_line,
)
from app.modules.order.schemas import (
    AdminOrderUpdate,
    CheckoutRequest,
    OrderListResponse,
    OrderResponse,
)
from app.modules.payment.models import Payment


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    return parse_uuid(value, label=label)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _next_order_number(session: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"FS-{today}-"
    count = await session.scalar(
        select(func.count()).select_from(Order).where(Order.order_number.like(f"{prefix}%"))
    )
    return f"{prefix}{(count or 0) + 1:04d}"


def _primary_image(product: Product) -> str | None:
    for img in product.images:
        if img.is_primary:
            return img.url
    return product.images[0].url if product.images else None


def _to_order_response(order: Order) -> OrderResponse:
    return OrderResponse.model_validate(order)


async def _get_order_or_404(order_id: str | uuid.UUID, session: AsyncSession) -> Order:
    return await get_order_or_404(order_id, session)


async def _load_variant_bundle(
    variant_id: uuid.UUID, session: AsyncSession
) -> tuple[ProductVariant, Product]:
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


async def checkout(
    user_id: str,
    body: CheckoutRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> OrderResponse:
    uid = _parse_uuid(user_id, label="user id")
    aid = _parse_uuid(actor_id) if actor_id else uid

    user = (await session.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    address = (
        await session.execute(
            select(UserAddress).where(
                UserAddress.id == _parse_uuid(body.address_id, label="address id"),
                UserAddress.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if address is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Address not found")

    cart = await cart_service.get_cart_model(user_id, session)
    if not cart.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    priced_lines: list[tuple] = []
    for item in cart.items:
        variant, product = await _load_variant_bundle(item.variant_id, session)
        assert_purchasable(product, variant, item.quantity)
        priced = price_line(product, variant, item.quantity)
        priced_lines.append((item, variant, product, priced))

    subtotal, tax_amount, shipping, total = cart_totals([p[3] for p in priced_lines])

    order_status = OrderStatus.confirmed if body.payment_method == PaymentMethod.cod else OrderStatus.pending
    payment_status = PaymentStatus.pending

    order = Order(
        order_number=await _next_order_number(session),
        user_id=uid,
        status=order_status,
        payment_status=payment_status,
        payment_method=body.payment_method,
        currency=CURRENCY,
        subtotal=subtotal,
        tax_amount=tax_amount,
        shipping_amount=shipping,
        discount_amount=0,
        total=total,
        shipping_label=address.label,
        shipping_line1=address.line1,
        shipping_line2=address.line2,
        shipping_city=address.city,
        shipping_state=address.state,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
        customer_name=user.name,
        customer_phone=user.phone or "",
        customer_email=user.email,
        notes=body.notes,
    )
    stamp_create(order, aid)
    session.add(order)
    await session.flush()

    for cart_item, variant, product, priced in priced_lines:
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            variant_id=variant.id,
            product_name=product.name,
            variant_name=variant.name,
            sku=variant.sku,
            unit_label=product.unit_label,
            primary_image_url=_primary_image(product),
            quantity=cart_item.quantity,
            unit_price=priced.unit_price,
            line_subtotal=priced.line_subtotal,
            tax_percent=priced.tax_percent,
            tax_amount=priced.tax_amount,
            line_total=priced.line_total,
        )
        stamp_create(order_item, aid)
        session.add(order_item)

        if product.track_inventory:
            variant.stock_qty = max(0, variant.stock_qty - cart_item.quantity)
            stamp_update(variant, aid)

    payment = Payment(
        order_id=order.id,
        amount=total,
        currency=CURRENCY,
        status=payment_status,
        method=body.payment_method,
        provider="cod" if body.payment_method == PaymentMethod.cod else None,
    )
    stamp_create(payment, aid)
    session.add(payment)

    for item in list(cart.items):
        await session.delete(item)
    cart.items = []

    await session.flush()
    await session.refresh(order, ["items"])
    return _to_order_response(order)


async def list_my_orders(
    user_id: str,
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
) -> OrderListResponse:
    uid = _parse_uuid(user_id, label="user id")
    offset = (page - 1) * page_size

    total = await session.scalar(
        select(func.count()).select_from(Order).where(Order.user_id == uid)
    )
    rows = (
        await session.execute(
            select(Order)
            .where(Order.user_id == uid)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()

    return OrderListResponse(
        items=[_to_order_response(o) for o in rows],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


async def get_my_order(
    user_id: str,
    order_id: str,
    session: AsyncSession,
) -> OrderResponse:
    order = await _get_order_or_404(order_id, session)
    if order.user_id != _parse_uuid(user_id, label="user id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")
    return _to_order_response(order)


async def cancel_my_order(
    user_id: str,
    order_id: str,
    session: AsyncSession,
    *,
    reason: str | None = None,
    actor_id: str | uuid.UUID | None = None,
) -> OrderResponse:
    order = await _get_order_or_404(order_id, session)
    uid = _parse_uuid(user_id, label="user id")
    if order.user_id != uid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")

    if order.status in (OrderStatus.shipped, OrderStatus.delivered, OrderStatus.cancelled):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in {order.status.value} status",
        )

    aid = _parse_uuid(actor_id) if actor_id else uid
    await restore_stock(order, session, actor_id=aid)

    order.status = OrderStatus.cancelled
    order.payment_status = (
        PaymentStatus.refunded
        if order.payment_status == PaymentStatus.paid
        else order.payment_status
    )
    order.cancelled_at = _utcnow()
    order.cancel_reason = reason
    stamp_update(order, aid)

    payment = (
        await session.execute(select(Payment).where(Payment.order_id == order.id))
    ).scalar_one_or_none()
    if payment and payment.status == PaymentStatus.paid:
        payment.status = PaymentStatus.refunded
        stamp_update(payment, aid)

    await session.flush()
    await session.refresh(order, attribute_names=["items"])
    return _to_order_response(order)


async def _restore_stock(
    order: Order,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
) -> None:
    await restore_stock(order, session, actor_id=actor_id)


async def list_all_orders(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: OrderStatus | None = None,
) -> OrderListResponse:
    offset = (page - 1) * page_size
    query = select(Order).options(selectinload(Order.items))
    count_query = select(func.count()).select_from(Order)

    if status_filter is not None:
        query = query.where(Order.status == status_filter)
        count_query = count_query.where(Order.status == status_filter)

    total = await session.scalar(count_query)
    rows = (
        await session.execute(
            query.order_by(Order.created_at.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()

    return OrderListResponse(
        items=[_to_order_response(o) for o in rows],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


async def get_order_admin(order_id: str, session: AsyncSession) -> OrderResponse:
    return _to_order_response(await _get_order_or_404(order_id, session))


async def update_order_admin(
    order_id: str,
    body: AdminOrderUpdate,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> OrderResponse:
    order = await _get_order_or_404(order_id, session)
    aid = _parse_uuid(actor_id) if actor_id else None

    if body.status is not None:
        if body.status == OrderStatus.cancelled and order.status != OrderStatus.cancelled:
            await restore_stock(order, session, actor_id=aid)
            order.cancelled_at = _utcnow()
        order.status = body.status

    if body.payment_status is not None:
        order.payment_status = body.payment_status
        payment = (
            await session.execute(select(Payment).where(Payment.order_id == order.id))
        ).scalar_one_or_none()
        if payment:
            payment.status = body.payment_status
            if body.payment_status == PaymentStatus.paid and payment.paid_at is None:
                payment.paid_at = _utcnow()
            stamp_update(payment, aid)

    stamp_update(order, aid)
    await session.flush()
    await session.refresh(order, attribute_names=["items"])
    return _to_order_response(order)
