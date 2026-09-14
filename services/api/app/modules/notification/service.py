from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.mixins import stamp_create
from app.modules.notification.delivery import send_email_message, send_sms_message
from app.modules.notification.models import (
    NotificationChannel,
    NotificationEvent,
    NotificationLog,
    NotificationStatus,
)
from app.modules.order.models import Order, OrderStatus, PaymentStatus

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def event_for_order_status(status: OrderStatus) -> NotificationEvent | None:
    mapping = {
        OrderStatus.pending: NotificationEvent.order_placed,
        OrderStatus.confirmed: NotificationEvent.order_confirmed,
        OrderStatus.processing: NotificationEvent.order_processing,
        OrderStatus.shipped: NotificationEvent.order_shipped,
        OrderStatus.delivered: NotificationEvent.order_delivered,
        OrderStatus.cancelled: NotificationEvent.order_cancelled,
    }
    return mapping.get(status)


def _templates(order: Order, event: NotificationEvent) -> tuple[str, str, str]:
    """Return email_subject, email_body, sms_body."""
    num = order.order_number
    total = f"₹{order.total}"
    if event == NotificationEvent.order_placed:
        return (
            f"Order {num} received",
            f"Hi {order.customer_name},\n\nWe received your Fruit Shop order {num} ({total}). "
            "We'll confirm it once payment is complete.\n\nThank you!",
            f"Fruit Shop: order {num} received ({total}). Awaiting payment.",
        )
    if event == NotificationEvent.order_confirmed:
        return (
            f"Order {num} confirmed",
            f"Hi {order.customer_name},\n\nYour Fruit Shop order {num} is confirmed ({total}). "
            "We're preparing your fruit.\n\nThank you!",
            f"Fruit Shop: order {num} confirmed ({total}).",
        )
    if event == NotificationEvent.order_processing:
        return (
            f"Order {num} is being prepared",
            f"Hi {order.customer_name},\n\nYour order {num} is now being packed.\n\nFruit Shop",
            f"Fruit Shop: order {num} is being prepared.",
        )
    if event == NotificationEvent.order_shipped:
        tracking = ""
        if order.tracking_number:
            carrier = f" via {order.carrier}" if order.carrier else ""
            tracking = f"\nTracking{carrier}: {order.tracking_number}"
            sms_track = f" Track: {order.tracking_number}."
        else:
            sms_track = ""
        return (
            f"Order {num} shipped",
            f"Hi {order.customer_name},\n\nGood news — order {num} is on the way to "
            f"{order.shipping_city}.{tracking}\n\nFruit Shop",
            f"Fruit Shop: order {num} shipped to {order.shipping_city}.{sms_track}",
        )
    if event == NotificationEvent.order_delivered:
        return (
            f"Order {num} delivered",
            f"Hi {order.customer_name},\n\nOrder {num} was marked delivered. Enjoy your fruit!\n\n"
            "Fruit Shop",
            f"Fruit Shop: order {num} delivered. Enjoy!",
        )
    if event == NotificationEvent.order_cancelled:
        reason = f" Reason: {order.cancel_reason}." if order.cancel_reason else ""
        return (
            f"Order {num} cancelled",
            f"Hi {order.customer_name},\n\nOrder {num} has been cancelled.{reason}\n\nFruit Shop",
            f"Fruit Shop: order {num} cancelled.",
        )
    if event == NotificationEvent.payment_paid:
        return (
            f"Payment received for {num}",
            f"Hi {order.customer_name},\n\nWe received payment for order {num} ({total}).\n\nFruit Shop",
            f"Fruit Shop: payment received for {num} ({total}).",
        )
    if event == NotificationEvent.payment_refunded:
        return (
            f"Refund for order {num}",
            f"Hi {order.customer_name},\n\nA refund was issued for order {num} ({total}).\n\nFruit Shop",
            f"Fruit Shop: refund issued for {num}.",
        )
    return (
        f"Order {num} update",
        f"Hi {order.customer_name},\n\nYour order {num} was updated.\n\nFruit Shop",
        f"Fruit Shop: order {num} updated.",
    )


async def _record_and_send(
    *,
    order: Order,
    event: NotificationEvent,
    channel: NotificationChannel,
    recipient: str,
    subject: str | None,
    body: str,
    settings: Settings,
    session: AsyncSession,
) -> None:
    existing = (
        await session.execute(
            select(NotificationLog).where(
                NotificationLog.order_id == order.id,
                NotificationLog.event == event,
                NotificationLog.channel == channel,
            )
        )
    ).scalar_one_or_none()
    if existing is not None and existing.status == NotificationStatus.sent:
        return

    log = existing
    if log is None:
        log = NotificationLog(
            user_id=order.user_id,
            order_id=order.id,
            event=event,
            channel=channel,
            recipient=recipient,
            subject=subject,
            body=body,
            status=NotificationStatus.skipped,
        )
        stamp_create(log, order.user_id)
        session.add(log)
        await session.flush()
    else:
        log.recipient = recipient
        log.subject = subject
        log.body = body

    if channel == NotificationChannel.email:
        ok, err = await send_email_message(
            to=recipient, subject=subject or "Fruit Shop", body=body, settings=settings
        )
    else:
        ok, err = await send_sms_message(phone=recipient, body=body, settings=settings)

    log.status = NotificationStatus.sent if ok else NotificationStatus.failed
    log.error = err
    log.sent_at = _utcnow() if ok else None
    await session.flush()


async def notify_order_event(
    order: Order,
    event: NotificationEvent,
    settings: Settings,
    session: AsyncSession,
) -> None:
    subject, email_body, sms_body = _templates(order, event)

    if order.customer_email:
        try:
            await _record_and_send(
                order=order,
                event=event,
                channel=NotificationChannel.email,
                recipient=order.customer_email,
                subject=subject,
                body=email_body,
                settings=settings,
                session=session,
            )
        except Exception:
            logger.exception("order_email_notify_failed order=%s event=%s", order.id, event)

    phone = (order.customer_phone or "").strip()
    # Prefer SMS for phone-first customers, and always for shipped/cancelled/confirmed
    sms_events = {
        NotificationEvent.order_placed,
        NotificationEvent.order_confirmed,
        NotificationEvent.order_shipped,
        NotificationEvent.order_delivered,
        NotificationEvent.order_cancelled,
        NotificationEvent.payment_paid,
        NotificationEvent.payment_refunded,
    }
    if phone and event in sms_events:
        try:
            await _record_and_send(
                order=order,
                event=event,
                channel=NotificationChannel.sms,
                recipient=phone,
                subject=None,
                body=sms_body,
                settings=settings,
                session=session,
            )
        except Exception:
            logger.exception("order_sms_notify_failed order=%s event=%s", order.id, event)


async def notify_order_status_change(
    order: Order,
    *,
    previous_status: OrderStatus | None,
    settings: Settings,
    session: AsyncSession,
) -> None:
    if previous_status == order.status:
        return
    event = event_for_order_status(order.status)
    if event is None:
        return
    await notify_order_event(order, event, settings, session)


async def notify_payment_status_change(
    order: Order,
    *,
    payment_status: PaymentStatus,
    settings: Settings,
    session: AsyncSession,
) -> None:
    if payment_status == PaymentStatus.paid:
        await notify_order_event(order, NotificationEvent.payment_paid, settings, session)
    elif payment_status == PaymentStatus.refunded:
        await notify_order_event(
            order, NotificationEvent.payment_refunded, settings, session
        )
