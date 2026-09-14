from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings, get_settings
from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.models import User, UserAddress
from app.modules.cart import service as cart_service
from app.modules.catalog.models import Product, ProductVariant
from app.modules.coupon import service as coupon_service
from app.modules.inventory import service as inventory_service
from app.modules.notification import service as notification_service
from app.modules.order.helpers import (
    get_order_or_404,
    load_variant_bundle,
    parse_uuid,
    record_status_event,
    restore_stock,
)
from app.modules.order.models import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.modules.order.pricing import CURRENCY, assert_purchasable, price_line
from app.modules.order.schemas import (
    AdminOrderUpdate,
    CheckoutRequest,
    InternalNoteRequest,
    OrderListResponse,
    OrderResponse,
    OrderStatusEventResponse,
    ShipOrderRequest,
)
from app.modules.order.transitions import (
    CUSTOMER_CANCELLABLE,
    assert_transition,
    next_actions,
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


def to_order_response(order: Order, *, staff: bool = False) -> OrderResponse:
    data = OrderResponse.model_validate(order)
    events = list(order.status_events or [])
    events.sort(key=lambda e: e.created_at or datetime.min.replace(tzinfo=timezone.utc))
    data.timeline = [OrderStatusEventResponse.model_validate(e) for e in events]
    data.next_actions = next_actions(order.status) if staff else []
    data.can_cancel = order.status in CUSTOMER_CANCELLABLE
    if not staff:
        data.internal_notes = None
    return data


async def _order_response_after_write(
    order: Order,
    session: AsyncSession,
    *,
    staff: bool = False,
) -> OrderResponse:
    await session.flush()
    return to_order_response(await get_order_or_404(order.id, session), staff=staff)


async def _apply_status(
    order: Order,
    target: OrderStatus,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    note: str | None = None,
    cancel_reason: str | None = None,
) -> OrderStatus | None:
    """Apply a status change with transition checks, side effects, and timeline event.

    Returns previous status when a change happened, else None.
    """
    if order.status == target:
        return None

    assert_transition(order.status, target)
    previous = order.status

    if target == OrderStatus.cancelled:
        await restore_stock(order, session, actor_id=actor_id)
        order.cancelled_at = _utcnow()
        order.cancel_reason = cancel_reason or order.cancel_reason
        if previous in CUSTOMER_CANCELLABLE:
            await coupon_service.release_coupon_for_order(
                order.id, session, actor_id=actor_id
            )
        if order.payment_status == PaymentStatus.paid:
            order.payment_status = PaymentStatus.refunded
            payment = (
                await session.execute(select(Payment).where(Payment.order_id == order.id))
            ).scalar_one_or_none()
            if payment and payment.status == PaymentStatus.paid:
                payment.status = PaymentStatus.refunded
                stamp_update(payment, actor_id)

    if target == OrderStatus.shipped and order.shipped_at is None:
        order.shipped_at = _utcnow()
    if target == OrderStatus.delivered and order.delivered_at is None:
        order.delivered_at = _utcnow()

    order.status = target
    stamp_update(order, actor_id)
    await record_status_event(
        order,
        from_status=previous.value,
        to_status=target.value,
        note=note or cancel_reason,
        actor_id=actor_id,
        session=session,
    )
    return previous


async def checkout(
    user_id: str,
    body: CheckoutRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
    settings: Settings | None = None,
) -> OrderResponse:
    uid = _parse_uuid(user_id, label="user id")
    aid = _parse_uuid(actor_id) if actor_id else uid
    settings = settings or get_settings()

    if body.idempotency_key:
        existing = (
            await session.execute(
                select(Order)
                .where(Order.idempotency_key == body.idempotency_key.strip())
                .options(
                    selectinload(Order.items),
                    selectinload(Order.status_events),
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            if existing.user_id != uid:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail="Idempotency key already used",
                )
            return to_order_response(existing, staff=False)

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
        variant, product = await load_variant_bundle(item.variant_id, session)
        assert_purchasable(product, variant, item.quantity)
        priced = price_line(product, variant, item.quantity)
        priced_lines.append((item, variant, product, priced))

    subtotal, tax_amount, shipping, discount, total, coupon = await coupon_service.apply_coupon_to_totals(
        code=body.coupon_code,
        user_id=uid,
        lines=[p[3] for p in priced_lines],
        session=session,
    )

    order_status = (
        OrderStatus.confirmed if body.payment_method == PaymentMethod.cod else OrderStatus.pending
    )
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
        discount_amount=discount,
        total=total,
        coupon_id=coupon.id if coupon else None,
        coupon_code=coupon.code if coupon else None,
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
        idempotency_key=body.idempotency_key.strip() if body.idempotency_key else None,
    )
    stamp_create(order, aid)
    session.add(order)
    await session.flush()

    await record_status_event(
        order,
        from_status=None,
        to_status=order_status.value,
        note="Order placed",
        actor_id=aid,
        session=session,
    )

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
            await inventory_service.commit_sale(
                order_id=order.id,
                variant_id=variant.id,
                quantity=cart_item.quantity,
                session=session,
                actor_id=aid,
            )

    if coupon is not None:
        await coupon_service.redeem_coupon(
            coupon=coupon,
            user_id=uid,
            order_id=order.id,
            discount_amount=discount,
            session=session,
            actor_id=aid,
        )

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

    response = await _order_response_after_write(order, session, staff=False)
    await notification_service.notify_order_status_change(
        await get_order_or_404(order.id, session),
        previous_status=None,
        settings=settings,
        session=session,
    )
    return response


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
            .options(selectinload(Order.items), selectinload(Order.status_events))
            .order_by(Order.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()

    return OrderListResponse(
        items=[to_order_response(o, staff=False) for o in rows],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


async def get_my_order(
    user_id: str,
    order_id: str,
    session: AsyncSession,
) -> OrderResponse:
    order = await get_order_or_404(order_id, session)
    if order.user_id != _parse_uuid(user_id, label="user id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")
    return to_order_response(order, staff=False)


async def cancel_my_order(
    user_id: str,
    order_id: str,
    session: AsyncSession,
    *,
    reason: str | None = None,
    actor_id: str | uuid.UUID | None = None,
    settings: Settings | None = None,
) -> OrderResponse:
    order = await get_order_or_404(order_id, session)
    uid = _parse_uuid(user_id, label="user id")
    if order.user_id != uid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your order")

    if order.status not in CUSTOMER_CANCELLABLE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in {order.status.value} status",
        )

    aid = _parse_uuid(actor_id) if actor_id else uid
    settings = settings or get_settings()
    previous = await _apply_status(
        order,
        OrderStatus.cancelled,
        session,
        actor_id=aid,
        note="Cancelled by customer",
        cancel_reason=reason,
    )

    response = await _order_response_after_write(order, session, staff=False)
    fresh = await get_order_or_404(order.id, session)
    if previous is not None:
        await notification_service.notify_order_status_change(
            fresh,
            previous_status=previous,
            settings=settings,
            session=session,
        )
        if fresh.payment_status == PaymentStatus.refunded:
            await notification_service.notify_payment_status_change(
                fresh,
                payment_status=PaymentStatus.refunded,
                settings=settings,
                session=session,
            )
    return response


async def list_all_orders(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: OrderStatus | None = None,
    payment_status: PaymentStatus | None = None,
    payment_method: PaymentMethod | None = None,
    search: str | None = None,
) -> OrderListResponse:
    offset = (page - 1) * page_size
    query = select(Order).options(
        selectinload(Order.items),
        selectinload(Order.status_events),
    )
    count_query = select(func.count()).select_from(Order)

    if status_filter is not None:
        query = query.where(Order.status == status_filter)
        count_query = count_query.where(Order.status == status_filter)
    if payment_status is not None:
        query = query.where(Order.payment_status == payment_status)
        count_query = count_query.where(Order.payment_status == payment_status)
    if payment_method is not None:
        query = query.where(Order.payment_method == payment_method)
        count_query = count_query.where(Order.payment_method == payment_method)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filt = or_(
            Order.order_number.ilike(term),
            Order.customer_phone.ilike(term),
            Order.customer_name.ilike(term),
            Order.customer_email.ilike(term),
            Order.tracking_number.ilike(term),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = await session.scalar(count_query)
    rows = (
        await session.execute(
            query.order_by(Order.created_at.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()

    return OrderListResponse(
        items=[to_order_response(o, staff=True) for o in rows],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


async def get_order_admin(order_id: str, session: AsyncSession) -> OrderResponse:
    return to_order_response(await get_order_or_404(order_id, session), staff=True)


async def update_order_admin(
    order_id: str,
    body: AdminOrderUpdate,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
    settings: Settings | None = None,
) -> OrderResponse:
    order = await get_order_or_404(order_id, session)
    aid = _parse_uuid(actor_id) if actor_id else None
    settings = settings or get_settings()
    previous_status = order.status
    previous_payment = order.payment_status
    changed_status: OrderStatus | None = None

    if body.tracking_number is not None:
        order.tracking_number = body.tracking_number.strip() or None
    if body.carrier is not None:
        order.carrier = body.carrier.strip() or None
    if body.internal_notes is not None:
        order.internal_notes = body.internal_notes

    if body.status is not None:
        changed_status = await _apply_status(
            order,
            body.status,
            session,
            actor_id=aid,
            note="Updated by staff",
            cancel_reason=body.cancel_reason,
        )

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
    response = await _order_response_after_write(order, session, staff=True)
    fresh = await get_order_or_404(order.id, session)

    if changed_status is not None:
        await notification_service.notify_order_status_change(
            fresh,
            previous_status=previous_status,
            settings=settings,
            session=session,
        )
    if body.payment_status is not None and body.payment_status != previous_payment:
        await notification_service.notify_payment_status_change(
            fresh,
            payment_status=body.payment_status,
            settings=settings,
            session=session,
        )
    return response


async def ship_order_admin(
    order_id: str,
    body: ShipOrderRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
    settings: Settings | None = None,
) -> OrderResponse:
    order = await get_order_or_404(order_id, session)
    aid = _parse_uuid(actor_id) if actor_id else None
    settings = settings or get_settings()

    if body.tracking_number is not None:
        order.tracking_number = body.tracking_number.strip() or None
    if body.carrier is not None:
        order.carrier = body.carrier.strip() or None

    previous = await _apply_status(
        order,
        OrderStatus.shipped,
        session,
        actor_id=aid,
        note=body.note or "Shipped",
    )
    response = await _order_response_after_write(order, session, staff=True)
    if previous is not None:
        await notification_service.notify_order_status_change(
            await get_order_or_404(order.id, session),
            previous_status=previous,
            settings=settings,
            session=session,
        )
    return response


async def set_internal_note_admin(
    order_id: str,
    body: InternalNoteRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> OrderResponse:
    order = await get_order_or_404(order_id, session)
    aid = _parse_uuid(actor_id) if actor_id else None
    order.internal_notes = body.note.strip()
    stamp_update(order, aid)
    return await _order_response_after_write(order, session, staff=True)


async def mark_confirmed_after_payment(
    order: Order,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
) -> OrderStatus | None:
    """Used by payment module when online payment succeeds."""
    if order.status != OrderStatus.pending:
        return None
    return await _apply_status(
        order,
        OrderStatus.confirmed,
        session,
        actor_id=actor_id,
        note="Payment confirmed",
    )
