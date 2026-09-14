from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.mixins import stamp_create, stamp_update
from app.modules.coupon.models import Coupon, CouponRedemption, DiscountType
from app.modules.coupon.schemas import (
    CouponCreate,
    CouponListResponse,
    CouponResponse,
    CouponUpdate,
    CouponValidateResponse,
)
from app.modules.order.models import Order, OrderStatus
from app.modules.order.pricing import (
    FREE_SHIPPING_THRESHOLD,
    SHIPPING_FEE,
    PricedLine,
    cart_totals,
    shipping_amount,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _normalize_code(code: str) -> str:
    return code.strip().upper()


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def compute_discount(
    coupon: Coupon,
    *,
    subtotal: Decimal,
    tax_amount: Decimal,
) -> tuple[Decimal, Decimal, bool]:
    """Return (discount_amount, shipping_amount, free_shipping)."""
    base_shipping = shipping_amount(subtotal)
    free_shipping = False
    discount = Decimal("0")

    if coupon.discount_type == DiscountType.percent:
        pct = Decimal(str(coupon.percent_off or 0))
        discount = _money(subtotal * pct / Decimal("100"))
        if coupon.max_discount is not None:
            discount = min(discount, _money(Decimal(str(coupon.max_discount))))
    elif coupon.discount_type == DiscountType.fixed:
        discount = _money(Decimal(str(coupon.amount_off or 0)))
        discount = min(discount, subtotal)
    elif coupon.discount_type == DiscountType.free_shipping:
        free_shipping = True
        discount = Decimal("0")

    shipping = Decimal("0") if free_shipping else base_shipping
    # Discount cannot exceed merchandise + tax + shipping paid
    payable_before_discount = subtotal + tax_amount + shipping
    discount = min(discount, payable_before_discount)
    return discount, shipping, free_shipping


async def _user_order_count(user_id: uuid.UUID, session: AsyncSession) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(Order)
            .where(
                Order.user_id == user_id,
                Order.status != OrderStatus.cancelled,
            )
        )
        or 0
    )


async def _user_redemption_count(
    coupon_id: uuid.UUID, user_id: uuid.UUID, session: AsyncSession
) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(CouponRedemption)
            .where(
                CouponRedemption.coupon_id == coupon_id,
                CouponRedemption.user_id == user_id,
            )
        )
        or 0
    )


async def get_coupon_by_code(code: str, session: AsyncSession) -> Coupon | None:
    return (
        await session.execute(select(Coupon).where(Coupon.code == _normalize_code(code)))
    ).scalar_one_or_none()


async def assert_coupon_applicable(
    coupon: Coupon,
    *,
    user_id: uuid.UUID,
    subtotal: Decimal,
    session: AsyncSession,
) -> None:
    now = _utcnow()
    if not coupon.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Coupon is inactive")
    if coupon.starts_at and _as_utc(coupon.starts_at) > now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Coupon is not active yet")
    if coupon.ends_at and _as_utc(coupon.ends_at) < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Coupon has expired")
    if coupon.usage_limit is not None and coupon.usage_count >= coupon.usage_limit:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Coupon usage limit reached")
    if subtotal < Decimal(str(coupon.min_subtotal or 0)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum cart subtotal is ₹{coupon.min_subtotal}",
        )
    if coupon.first_order_only:
        prior = await _user_order_count(user_id, session)
        if prior > 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Coupon is valid for first order only",
            )
    if coupon.per_user_limit is not None:
        used = await _user_redemption_count(coupon.id, user_id, session)
        if used >= coupon.per_user_limit:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="You have already used this coupon the maximum number of times",
            )


async def apply_coupon_to_totals(
    *,
    code: str | None,
    user_id: uuid.UUID,
    lines: list[PricedLine],
    session: AsyncSession,
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal, Coupon | None]:
    """Return subtotal, tax, shipping, discount, total, coupon."""
    if not code or not code.strip():
        subtotal, tax, shipping, total = cart_totals(lines)
        return subtotal, tax, shipping, Decimal("0"), total, None

    coupon = await get_coupon_by_code(code, session)
    if coupon is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    # Preliminary totals for eligibility (shipping may change)
    subtotal, tax, _shipping, _total = cart_totals(lines)
    await assert_coupon_applicable(coupon, user_id=user_id, subtotal=subtotal, session=session)
    discount, shipping, _free = compute_discount(coupon, subtotal=subtotal, tax_amount=tax)
    total = _money(max(Decimal("0"), subtotal + tax + shipping - discount))
    return subtotal, tax, shipping, discount, total, coupon


async def redeem_coupon(
    *,
    coupon: Coupon,
    user_id: uuid.UUID,
    order_id: uuid.UUID,
    discount_amount: Decimal,
    session: AsyncSession,
    actor_id: uuid.UUID | None,
) -> CouponRedemption:
    coupon.usage_count = (coupon.usage_count or 0) + 1
    stamp_update(coupon, actor_id)
    redemption = CouponRedemption(
        coupon_id=coupon.id,
        user_id=user_id,
        order_id=order_id,
        discount_amount=discount_amount,
        code_snapshot=coupon.code,
    )
    stamp_create(redemption, actor_id)
    session.add(redemption)
    await session.flush()
    return redemption


async def release_coupon_for_order(
    order_id: uuid.UUID,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
) -> None:
    redemption = (
        await session.execute(
            select(CouponRedemption).where(CouponRedemption.order_id == order_id)
        )
    ).scalar_one_or_none()
    if redemption is None:
        return
    coupon = await session.get(Coupon, redemption.coupon_id)
    if coupon is not None and coupon.usage_count > 0:
        coupon.usage_count -= 1
        stamp_update(coupon, actor_id)
    await session.delete(redemption)
    await session.flush()


def to_response(coupon: Coupon) -> CouponResponse:
    return CouponResponse.model_validate(coupon)


async def create_coupon(
    payload: CouponCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> CouponResponse:
    code = _normalize_code(payload.code)
    existing = await get_coupon_by_code(code, session)
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Coupon code already exists")

    actor = _parse_uuid(actor_id, label="actor id")
    coupon = Coupon(
        code=code,
        name=payload.name.strip(),
        description=payload.description,
        discount_type=payload.discount_type,
        percent_off=payload.percent_off,
        amount_off=payload.amount_off,
        max_discount=payload.max_discount,
        min_subtotal=payload.min_subtotal,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        is_active=payload.is_active,
        usage_limit=payload.usage_limit,
        per_user_limit=payload.per_user_limit,
        first_order_only=payload.first_order_only,
        usage_count=0,
    )
    stamp_create(coupon, actor)
    session.add(coupon)
    await session.flush()
    return to_response(coupon)


async def update_coupon(
    coupon_id: str,
    payload: CouponUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> CouponResponse:
    coupon = await session.get(Coupon, _parse_uuid(coupon_id, label="coupon id"))
    if coupon is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(coupon, key, value)
    stamp_update(coupon, _parse_uuid(actor_id, label="actor id"))
    await session.flush()
    return to_response(coupon)


async def delete_coupon(coupon_id: str, session: AsyncSession) -> None:
    coupon = await session.get(Coupon, _parse_uuid(coupon_id, label="coupon id"))
    if coupon is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    await session.delete(coupon)
    await session.flush()


async def get_coupon(coupon_id: str, session: AsyncSession) -> CouponResponse:
    coupon = await session.get(Coupon, _parse_uuid(coupon_id, label="coupon id"))
    if coupon is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return to_response(coupon)


async def list_coupons(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    active_only: bool = False,
    search: str | None = None,
) -> CouponListResponse:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    query = select(Coupon)
    count_query = select(func.count()).select_from(Coupon)
    if active_only:
        query = query.where(Coupon.is_active.is_(True))
        count_query = count_query.where(Coupon.is_active.is_(True))
    if search:
        like = f"%{search.strip()}%"
        filt = or_(Coupon.code.ilike(like), Coupon.name.ilike(like))
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = await session.scalar(count_query) or 0
    rows = (
        await session.execute(
            query.order_by(Coupon.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return CouponListResponse(
        items=[to_response(c) for c in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def validate_for_user_cart(
    *,
    code: str,
    user_id: str,
    lines: list[PricedLine],
    session: AsyncSession,
) -> CouponValidateResponse:
    uid = _parse_uuid(user_id, label="user id")
    try:
        subtotal, tax, shipping, discount, total, coupon = await apply_coupon_to_totals(
            code=code,
            user_id=uid,
            lines=lines,
            session=session,
        )
    except HTTPException as exc:
        subtotal, tax, shipping, total = cart_totals(lines)
        return CouponValidateResponse(
            valid=False,
            code=_normalize_code(code),
            discount_type=DiscountType.percent,
            discount_amount=Decimal("0"),
            shipping_amount=shipping,
            subtotal=subtotal,
            tax_amount=tax,
            total=total,
            message=str(exc.detail),
        )

    assert coupon is not None
    return CouponValidateResponse(
        valid=True,
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_amount=discount,
        shipping_amount=shipping,
        subtotal=subtotal,
        tax_amount=tax,
        total=total,
        message="Coupon applied",
    )


# silence unused import warnings for threshold constants used by docs/consumers
_ = (FREE_SHIPPING_THRESHOLD, SHIPPING_FEE)
