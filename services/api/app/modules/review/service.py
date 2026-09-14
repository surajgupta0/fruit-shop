from __future__ import annotations

import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.auth.models import User
from app.modules.catalog.models import Product
from app.modules.order.models import Order, OrderItem, OrderStatus
from app.modules.review.models import Review, ReviewStatus
from app.modules.review.schemas import (
    ProductRatingSummary,
    ReviewCreate,
    ReviewEligibilityResponse,
    ReviewListResponse,
    ReviewModerateRequest,
    ReviewResponse,
    ReviewUpdate,
)


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def _actor(actor_id: str | uuid.UUID | None) -> uuid.UUID | None:
    if actor_id is None:
        return None
    return _parse_uuid(actor_id, label="user id")


def _money_rating(value: float | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _to_response(review: Review) -> ReviewResponse:
    author_name = review.user.name if review.user is not None else None
    product_name = review.product.name if review.product is not None else None
    product_slug = review.product.slug if review.product is not None else None
    return ReviewResponse(
        id=review.id,
        product_id=review.product_id,
        user_id=review.user_id,
        order_id=review.order_id,
        rating=review.rating,
        title=review.title,
        body=review.body,
        status=review.status.value if hasattr(review.status, "value") else str(review.status),
        is_verified_purchase=review.is_verified_purchase,
        admin_note=review.admin_note,
        author_name=author_name,
        product_name=product_name,
        product_slug=product_slug,
        created_at=review.created_at,
        updated_at=review.updated_at,
        created_by=review.created_by,
        updated_by=review.updated_by,
    )


def _review_query() -> Select[tuple[Review]]:
    return select(Review).options(
        selectinload(Review.user),
        selectinload(Review.product),
    )


async def _get_review_or_404(review_id: uuid.UUID, session: AsyncSession) -> Review:
    review = (
        await session.execute(_review_query().where(Review.id == review_id))
    ).scalar_one_or_none()
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


async def _require_active_product(product_id: uuid.UUID, session: AsyncSession) -> Product:
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def find_delivered_order_for_product(
    *,
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    session: AsyncSession,
) -> Order | None:
    """Most recent delivered order that included this product for the user."""
    return (
        await session.execute(
            select(Order)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                Order.user_id == user_id,
                Order.status == OrderStatus.delivered,
                OrderItem.product_id == product_id,
            )
            .order_by(Order.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def get_eligibility(
    *,
    product_id: str | uuid.UUID,
    user_id: str | uuid.UUID,
    session: AsyncSession,
) -> ReviewEligibilityResponse:
    pid = _parse_uuid(product_id, label="product id")
    uid = _parse_uuid(user_id, label="user id")
    await _require_active_product(pid, session)

    existing = (
        await session.execute(
            select(Review).where(Review.user_id == uid, Review.product_id == pid)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return ReviewEligibilityResponse(
            product_id=pid,
            can_review=False,
            reason="You already reviewed this product",
            existing_review_id=existing.id,
            order_id=existing.order_id,
        )

    order = await find_delivered_order_for_product(
        user_id=uid, product_id=pid, session=session
    )
    if order is None:
        return ReviewEligibilityResponse(
            product_id=pid,
            can_review=False,
            reason="Buy and receive this product before leaving a review",
        )

    return ReviewEligibilityResponse(
        product_id=pid,
        can_review=True,
        order_id=order.id,
    )


async def create_review(
    payload: ReviewCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ReviewResponse:
    uid = _parse_uuid(actor_id, label="user id")
    await _require_active_product(payload.product_id, session)

    existing = (
        await session.execute(
            select(Review.id).where(
                Review.user_id == uid,
                Review.product_id == payload.product_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="You already reviewed this product",
        )

    order = await find_delivered_order_for_product(
        user_id=uid, product_id=payload.product_id, session=session
    )
    if order is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only customers with a delivered order can review this product",
        )

    title = payload.title.strip() if payload.title else None
    body = payload.body.strip() if payload.body else None
    if title == "":
        title = None
    if body == "":
        body = None

    review = Review(
        product_id=payload.product_id,
        user_id=uid,
        order_id=order.id,
        rating=payload.rating,
        title=title,
        body=body,
        status=ReviewStatus.approved,
        is_verified_purchase=True,
    )
    stamp_create(review, uid)
    session.add(review)
    await session.commit()
    return _to_response(await _get_review_or_404(review.id, session))


async def update_my_review(
    review_id: str | uuid.UUID,
    payload: ReviewUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ReviewResponse:
    rid = _parse_uuid(review_id, label="review id")
    uid = _parse_uuid(actor_id, label="user id")
    review = await _get_review_or_404(rid, session)
    if review.user_id != uid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your review")
    if review.status == ReviewStatus.hidden:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="This review was removed and cannot be edited",
        )

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        data["title"] = data["title"].strip() or None
    if "body" in data and data["body"] is not None:
        data["body"] = data["body"].strip() or None

    for key, value in data.items():
        setattr(review, key, value)

    # Re-approve verified edits so they stay public unless previously rejected/hidden.
    if review.status == ReviewStatus.rejected:
        review.status = ReviewStatus.pending
    elif review.status == ReviewStatus.pending:
        pass
    else:
        review.status = ReviewStatus.approved

    stamp_update(review, uid)
    await session.commit()
    return _to_response(await _get_review_or_404(rid, session))


async def delete_my_review(
    review_id: str | uuid.UUID,
    session: AsyncSession,
    *,
    actor_id: str,
) -> None:
    rid = _parse_uuid(review_id, label="review id")
    uid = _parse_uuid(actor_id, label="user id")
    review = await _get_review_or_404(rid, session)
    if review.user_id != uid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your review")
    await session.delete(review)
    await session.commit()


async def list_product_reviews(
    product_id: str | uuid.UUID,
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
) -> ReviewListResponse:
    pid = _parse_uuid(product_id, label="product id")
    await _require_active_product(pid, session)

    filters = [
        Review.product_id == pid,
        Review.status == ReviewStatus.approved,
    ]
    total = (
        await session.scalar(select(func.count()).select_from(Review).where(*filters))
        or 0
    )
    rows = (
        await session.execute(
            _review_query()
            .where(*filters)
            .order_by(Review.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return ReviewListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def list_my_reviews(
    session: AsyncSession,
    *,
    actor_id: str,
    page: int = 1,
    page_size: int = 20,
) -> ReviewListResponse:
    uid = _parse_uuid(actor_id, label="user id")
    filters = [Review.user_id == uid]
    total = (
        await session.scalar(select(func.count()).select_from(Review).where(*filters))
        or 0
    )
    rows = (
        await session.execute(
            _review_query()
            .where(*filters)
            .order_by(Review.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return ReviewListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def list_reviews_admin(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: ReviewStatus | None = None,
    product_id: str | uuid.UUID | None = None,
    search: str | None = None,
) -> ReviewListResponse:
    filters = []
    if status_filter is not None:
        filters.append(Review.status == status_filter)
    if product_id is not None:
        filters.append(Review.product_id == _parse_uuid(product_id, label="product id"))

    q = _review_query()
    count_q = select(func.count()).select_from(Review)
    if filters:
        q = q.where(*filters)
        count_q = count_q.where(*filters)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        q = q.join(User, User.id == Review.user_id).where(
            func.lower(User.name).like(term)
            | func.lower(func.coalesce(Review.title, "")).like(term)
            | func.lower(func.coalesce(Review.body, "")).like(term)
        )
        count_q = (
            select(func.count())
            .select_from(Review)
            .join(User, User.id == Review.user_id)
            .where(*filters)
            .where(
                func.lower(User.name).like(term)
                | func.lower(func.coalesce(Review.title, "")).like(term)
                | func.lower(func.coalesce(Review.body, "")).like(term)
            )
            if filters
            else select(func.count())
            .select_from(Review)
            .join(User, User.id == Review.user_id)
            .where(
                func.lower(User.name).like(term)
                | func.lower(func.coalesce(Review.title, "")).like(term)
                | func.lower(func.coalesce(Review.body, "")).like(term)
            )
        )

    total = await session.scalar(count_q) or 0
    rows = (
        await session.execute(
            q.order_by(Review.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().unique().all()
    return ReviewListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_review_admin(
    review_id: str | uuid.UUID,
    session: AsyncSession,
) -> ReviewResponse:
    return _to_response(await _get_review_or_404(_parse_uuid(review_id, label="review id"), session))


async def moderate_review(
    review_id: str | uuid.UUID,
    payload: ReviewModerateRequest,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ReviewResponse:
    rid = _parse_uuid(review_id, label="review id")
    review = await _get_review_or_404(rid, session)
    review.status = payload.status
    if payload.admin_note is not None:
        note = payload.admin_note.strip()
        review.admin_note = note or None
    stamp_update(review, _actor(actor_id))
    await session.commit()
    return _to_response(await _get_review_or_404(rid, session))


async def delete_review_admin(
    review_id: str | uuid.UUID,
    session: AsyncSession,
) -> None:
    rid = _parse_uuid(review_id, label="review id")
    review = await _get_review_or_404(rid, session)
    await session.delete(review)
    await session.commit()


async def product_rating_summary(
    product_id: str | uuid.UUID,
    session: AsyncSession,
) -> ProductRatingSummary:
    pid = _parse_uuid(product_id, label="product id")
    await _require_active_product(pid, session)
    summaries = await rating_summaries_for_products([pid], session)
    return summaries.get(
        pid,
        ProductRatingSummary(
            product_id=pid,
            average_rating=Decimal("0.00"),
            review_count=0,
        ),
    )


async def rating_summaries_for_products(
    product_ids: list[uuid.UUID],
    session: AsyncSession,
) -> dict[uuid.UUID, ProductRatingSummary]:
    if not product_ids:
        return {}

    rows = (
        await session.execute(
            select(
                Review.product_id,
                Review.rating,
                func.count().label("cnt"),
            )
            .where(
                Review.product_id.in_(product_ids),
                Review.status == ReviewStatus.approved,
            )
            .group_by(Review.product_id, Review.rating)
        )
    ).all()

    buckets: dict[uuid.UUID, dict[int, int]] = {
        pid: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} for pid in product_ids
    }
    for product_id, rating, cnt in rows:
        if rating in buckets[product_id]:
            buckets[product_id][int(rating)] = int(cnt)

    out: dict[uuid.UUID, ProductRatingSummary] = {}
    for pid, breakdown in buckets.items():
        total = sum(breakdown.values())
        if total == 0:
            avg = Decimal("0.00")
        else:
            weighted = sum(star * count for star, count in breakdown.items())
            avg = _money_rating(Decimal(weighted) / Decimal(total))
        out[pid] = ProductRatingSummary(
            product_id=pid,
            average_rating=avg,
            review_count=total,
            rating_breakdown=breakdown,
        )
    return out
