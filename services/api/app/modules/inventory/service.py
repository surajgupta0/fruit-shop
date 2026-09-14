from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.catalog.models import InventoryPolicy, Product, ProductVariant
from app.modules.inventory.models import (
    InventoryMovement,
    InventoryMovementType,
    InventoryReferenceType,
)
from app.modules.inventory.schemas import (
    InventoryAdjustRequest,
    InventoryLevelListResponse,
    InventoryLevelResponse,
    InventoryMovementListResponse,
    InventoryMovementResponse,
    InventoryReceiveRequest,
    InventorySetRequest,
)


def parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def available_qty(variant: ProductVariant) -> int:
    return max(0, int(variant.stock_qty) - int(variant.reserved_qty or 0))


def is_low_stock(variant: ProductVariant, *, track_inventory: bool) -> bool:
    if not track_inventory:
        return False
    return available_qty(variant) <= int(variant.low_stock_threshold)


def is_out_of_stock(variant: ProductVariant, *, track_inventory: bool) -> bool:
    if not track_inventory:
        return False
    if variant.inventory_policy == InventoryPolicy.continue_:
        return False
    return available_qty(variant) <= 0


async def _lock_variant(
    variant_id: uuid.UUID, session: AsyncSession
) -> ProductVariant:
    variant = (
        await session.execute(
            select(ProductVariant)
            .where(ProductVariant.id == variant_id)
            .options(selectinload(ProductVariant.product))
            .with_for_update()
        )
    ).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return variant


async def _find_by_idempotency(
    key: str, session: AsyncSession
) -> InventoryMovement | None:
    return (
        await session.execute(
            select(InventoryMovement).where(InventoryMovement.idempotency_key == key)
        )
    ).scalar_one_or_none()


def _movement_response(
    movement: InventoryMovement,
    *,
    sku: str | None = None,
    variant_name: str | None = None,
    product_name: str | None = None,
) -> InventoryMovementResponse:
    return InventoryMovementResponse(
        id=movement.id,
        variant_id=movement.variant_id,
        product_id=movement.product_id,
        movement_type=movement.movement_type.value
        if hasattr(movement.movement_type, "value")
        else str(movement.movement_type),
        quantity_delta=movement.quantity_delta,
        quantity_before=movement.quantity_before,
        quantity_after=movement.quantity_after,
        reason=movement.reason,
        note=movement.note,
        reference_type=(
            movement.reference_type.value
            if movement.reference_type is not None
            and hasattr(movement.reference_type, "value")
            else (str(movement.reference_type) if movement.reference_type else None)
        ),
        reference_id=movement.reference_id,
        idempotency_key=movement.idempotency_key,
        sku=sku,
        variant_name=variant_name,
        product_name=product_name,
        created_at=movement.created_at,
        updated_at=movement.updated_at,
        created_by=movement.created_by,
        updated_by=movement.updated_by,
    )


async def _record_movement(
    *,
    variant: ProductVariant,
    movement_type: InventoryMovementType,
    delta: int,
    quantity_before: int,
    quantity_after: int,
    reason: str | None,
    note: str | None,
    reference_type: InventoryReferenceType | None,
    reference_id: uuid.UUID | None,
    idempotency_key: str | None,
    actor_id: uuid.UUID | None,
    session: AsyncSession,
) -> InventoryMovement:
    movement = InventoryMovement(
        variant_id=variant.id,
        product_id=variant.product_id,
        movement_type=movement_type,
        quantity_delta=delta,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=reason,
        note=note,
        reference_type=reference_type,
        reference_id=reference_id,
        idempotency_key=idempotency_key,
    )
    stamp_create(movement, actor_id)
    session.add(movement)
    await session.flush()
    return movement


def _level_from_variant(variant: ProductVariant) -> InventoryLevelResponse:
    product = variant.product
    track = bool(product.track_inventory)
    avail = available_qty(variant) if track else variant.stock_qty
    return InventoryLevelResponse(
        variant_id=variant.id,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        variant_name=variant.name,
        sku=variant.sku,
        track_inventory=track,
        stock_qty=variant.stock_qty,
        reserved_qty=int(variant.reserved_qty or 0),
        available_qty=avail if track else variant.stock_qty,
        low_stock_threshold=variant.low_stock_threshold,
        inventory_policy=variant.inventory_policy.value
        if hasattr(variant.inventory_policy, "value")
        else str(variant.inventory_policy),
        is_low_stock=is_low_stock(variant, track_inventory=track),
        is_out_of_stock=is_out_of_stock(variant, track_inventory=track),
        is_active=variant.is_active,
    )


async def get_level(variant_id: str | uuid.UUID, session: AsyncSession) -> InventoryLevelResponse:
    vid = parse_uuid(variant_id, label="variant id")
    variant = (
        await session.execute(
            select(ProductVariant)
            .where(ProductVariant.id == vid)
            .options(selectinload(ProductVariant.product))
        )
    ).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return _level_from_variant(variant)


async def list_levels(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    product_id: str | uuid.UUID | None = None,
    low_stock_only: bool = False,
    out_of_stock_only: bool = False,
    active_only: bool = True,
) -> InventoryLevelListResponse:
    query: Select = (
        select(ProductVariant)
        .join(Product, Product.id == ProductVariant.product_id)
        .options(selectinload(ProductVariant.product))
    )
    count_query = (
        select(func.count())
        .select_from(ProductVariant)
        .join(Product, Product.id == ProductVariant.product_id)
    )

    if active_only:
        query = query.where(ProductVariant.is_active.is_(True))
        count_query = count_query.where(ProductVariant.is_active.is_(True))
    if product_id is not None:
        pid = parse_uuid(product_id, label="product id")
        query = query.where(ProductVariant.product_id == pid)
        count_query = count_query.where(ProductVariant.product_id == pid)
    if search:
        term = f"%{search.strip()}%"
        filt = or_(
            ProductVariant.sku.ilike(term),
            ProductVariant.name.ilike(term),
            Product.name.ilike(term),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)
    if low_stock_only:
        expr = (ProductVariant.stock_qty - ProductVariant.reserved_qty) <= ProductVariant.low_stock_threshold
        query = query.where(Product.track_inventory.is_(True), expr)
        count_query = count_query.where(Product.track_inventory.is_(True), expr)
    if out_of_stock_only:
        expr = (ProductVariant.stock_qty - ProductVariant.reserved_qty) <= 0
        query = query.where(
            Product.track_inventory.is_(True),
            ProductVariant.inventory_policy == InventoryPolicy.deny,
            expr,
        )
        count_query = count_query.where(
            Product.track_inventory.is_(True),
            ProductVariant.inventory_policy == InventoryPolicy.deny,
            expr,
        )

    total = await session.scalar(count_query) or 0
    rows = (
        await session.execute(
            query.order_by(Product.name.asc(), ProductVariant.sku.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return InventoryLevelListResponse(
        items=[_level_from_variant(v) for v in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def list_movements(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    variant_id: str | uuid.UUID | None = None,
    product_id: str | uuid.UUID | None = None,
    movement_type: str | None = None,
    reference_id: str | uuid.UUID | None = None,
) -> InventoryMovementListResponse:
    query = select(InventoryMovement)
    count_query = select(func.count()).select_from(InventoryMovement)

    if variant_id is not None:
        vid = parse_uuid(variant_id, label="variant id")
        query = query.where(InventoryMovement.variant_id == vid)
        count_query = count_query.where(InventoryMovement.variant_id == vid)
    if product_id is not None:
        pid = parse_uuid(product_id, label="product id")
        query = query.where(InventoryMovement.product_id == pid)
        count_query = count_query.where(InventoryMovement.product_id == pid)
    if movement_type:
        query = query.where(InventoryMovement.movement_type == movement_type)
        count_query = count_query.where(InventoryMovement.movement_type == movement_type)
    if reference_id is not None:
        rid = parse_uuid(reference_id, label="reference id")
        query = query.where(InventoryMovement.reference_id == rid)
        count_query = count_query.where(InventoryMovement.reference_id == rid)

    total = await session.scalar(count_query) or 0
    rows = (
        await session.execute(
            query.order_by(InventoryMovement.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    variant_ids = {m.variant_id for m in rows}
    variants: dict[uuid.UUID, ProductVariant] = {}
    if variant_ids:
        loaded = (
            await session.execute(
                select(ProductVariant)
                .where(ProductVariant.id.in_(variant_ids))
                .options(selectinload(ProductVariant.product))
            )
        ).scalars().all()
        variants = {v.id: v for v in loaded}

    items = []
    for m in rows:
        v = variants.get(m.variant_id)
        items.append(
            _movement_response(
                m,
                sku=v.sku if v else None,
                variant_name=v.name if v else None,
                product_name=v.product.name if v else None,
            )
        )

    return InventoryMovementListResponse(
        items=items, total=total, page=page, page_size=page_size
    )


async def adjust_stock(
    body: InventoryAdjustRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None,
) -> InventoryLevelResponse:
    aid = parse_uuid(actor_id) if actor_id else None
    variant = await _lock_variant(body.variant_id, session)
    before = int(variant.stock_qty)
    after = before + body.delta
    if after < 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would make stock negative (on hand {before})",
        )
    variant.stock_qty = after
    stamp_update(variant, aid)
    await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.adjustment,
        delta=body.delta,
        quantity_before=before,
        quantity_after=after,
        reason=body.reason,
        note=body.note,
        reference_type=InventoryReferenceType.manual,
        reference_id=None,
        idempotency_key=f"adjustment:{uuid.uuid4()}",
        actor_id=aid,
        session=session,
    )
    return _level_from_variant(variant)


async def receive_stock(
    body: InventoryReceiveRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None,
) -> InventoryLevelResponse:
    aid = parse_uuid(actor_id) if actor_id else None
    variant = await _lock_variant(body.variant_id, session)
    before = int(variant.stock_qty)
    after = before + body.quantity
    variant.stock_qty = after
    stamp_update(variant, aid)
    await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.receive,
        delta=body.quantity,
        quantity_before=before,
        quantity_after=after,
        reason=body.reason,
        note=body.note,
        reference_type=InventoryReferenceType.manual,
        reference_id=None,
        idempotency_key=f"receive:{uuid.uuid4()}",
        actor_id=aid,
        session=session,
    )
    return _level_from_variant(variant)


async def set_stock(
    body: InventorySetRequest,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None,
    reference_type: InventoryReferenceType = InventoryReferenceType.manual,
    reference_id: uuid.UUID | None = None,
    idempotency_key: str | None = None,
) -> InventoryLevelResponse:
    aid = parse_uuid(actor_id) if actor_id else None
    variant = await _lock_variant(body.variant_id, session)
    before = int(variant.stock_qty)
    after = int(body.stock_qty)
    if before == after:
        return _level_from_variant(variant)

    variant.stock_qty = after
    stamp_update(variant, aid)
    await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.set,
        delta=after - before,
        quantity_before=before,
        quantity_after=after,
        reason=body.reason,
        note=body.note,
        reference_type=reference_type,
        reference_id=reference_id,
        idempotency_key=idempotency_key or f"set:{uuid.uuid4()}",
        actor_id=aid,
        session=session,
    )
    return _level_from_variant(variant)


async def record_opening_stock(
    variant: ProductVariant,
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    reason: str = "Opening stock",
) -> None:
    """Record initial qty when a variant is created (no lock; caller just flushed)."""
    qty = int(variant.stock_qty or 0)
    if qty <= 0:
        return
    await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.receive,
        delta=qty,
        quantity_before=0,
        quantity_after=qty,
        reason=reason,
        note=None,
        reference_type=InventoryReferenceType.catalog,
        reference_id=variant.id,
        idempotency_key=f"opening:{variant.id}",
        actor_id=actor_id,
        session=session,
    )


async def commit_sale(
    *,
    order_id: uuid.UUID,
    variant_id: uuid.UUID,
    quantity: int,
    session: AsyncSession,
    actor_id: uuid.UUID | None,
) -> InventoryMovement | None:
    """Decrement on-hand for an order line. Idempotent per order+variant."""
    if quantity <= 0:
        return None

    key = f"sale:{order_id}:{variant_id}"
    existing = await _find_by_idempotency(key, session)
    if existing is not None:
        return existing

    variant = await _lock_variant(variant_id, session)
    product = variant.product
    if not product.track_inventory:
        return None

    before = int(variant.stock_qty)
    avail = available_qty(variant)
    if variant.inventory_policy == InventoryPolicy.deny and avail < quantity:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Only {avail} left in stock for {variant.name}",
        )

    if variant.inventory_policy == InventoryPolicy.deny:
        after = before - quantity
        if after < int(variant.reserved_qty or 0):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Only {avail} left in stock for {variant.name}",
            )
    else:
        after = before - quantity

    variant.stock_qty = after
    stamp_update(variant, actor_id)
    return await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.sale,
        delta=-quantity,
        quantity_before=before,
        quantity_after=after,
        reason="Order sale",
        note=None,
        reference_type=InventoryReferenceType.order,
        reference_id=order_id,
        idempotency_key=key,
        actor_id=actor_id,
        session=session,
    )


async def restore_sale(
    *,
    order_id: uuid.UUID,
    variant_id: uuid.UUID,
    quantity: int,
    session: AsyncSession,
    actor_id: uuid.UUID | None,
) -> InventoryMovement | None:
    """Return stock for a cancelled/refunded order line. Idempotent."""
    if quantity <= 0:
        return None

    key = f"sale_restore:{order_id}:{variant_id}"
    existing = await _find_by_idempotency(key, session)
    if existing is not None:
        return existing

    sale_key = f"sale:{order_id}:{variant_id}"
    sale = await _find_by_idempotency(sale_key, session)

    variant = await _lock_variant(variant_id, session)
    if not variant.product.track_inventory and sale is None:
        return None

    before = int(variant.stock_qty)
    after = before + quantity
    variant.stock_qty = after
    stamp_update(variant, actor_id)
    return await _record_movement(
        variant=variant,
        movement_type=InventoryMovementType.sale_restore,
        delta=quantity,
        quantity_before=before,
        quantity_after=after,
        reason="Order stock restore",
        note=None,
        reference_type=InventoryReferenceType.order,
        reference_id=order_id,
        idempotency_key=key,
        actor_id=actor_id,
        session=session,
    )


async def restore_order_stock(
    order_id: uuid.UUID,
    lines: list[tuple[uuid.UUID, int]],
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
) -> None:
    for variant_id, quantity in lines:
        await restore_sale(
            order_id=order_id,
            variant_id=variant_id,
            quantity=quantity,
            session=session,
            actor_id=actor_id,
        )
