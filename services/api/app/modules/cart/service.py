from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.cart.models import Cart, CartItem
from app.modules.cart.schemas import CartItemResponse, CartResponse
from app.modules.catalog.models import Product, ProductImage, ProductStatus, ProductVariant
from app.modules.inventory.service import available_qty
from app.modules.order.pricing import CURRENCY, cart_totals, price_line


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


async def _get_or_create_cart(
    user_id: str | uuid.UUID,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> Cart:
    uid = _parse_uuid(user_id, label="user id")
    cart = (
        await session.execute(
            select(Cart)
            .where(Cart.user_id == uid)
            .options(selectinload(Cart.items))
        )
    ).scalar_one_or_none()
    if cart is not None:
        return cart
    cart = Cart(user_id=uid)
    stamp_create(cart, _parse_uuid(actor_id) if actor_id else uid)
    session.add(cart)
    await session.flush()
    await session.refresh(cart, ["items"])
    return cart


async def _load_variant_bundle(
    variant_id: uuid.UUID, session: AsyncSession
) -> tuple[ProductVariant, Product]:
    variant = (
        await session.execute(
            select(ProductVariant)
            .where(ProductVariant.id == variant_id)
            .options(
                selectinload(ProductVariant.product).selectinload(Product.images),
            )
        )
    ).scalar_one_or_none()
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return variant, variant.product


def _primary_image(product: Product) -> str | None:
    for img in product.images:
        if img.is_primary:
            return img.url
    return product.images[0].url if product.images else None


async def _build_cart_response(cart: Cart, session: AsyncSession) -> CartResponse:
    item_responses: list[CartItemResponse] = []
    priced_lines = []

    for item in cart.items:
        variant, product = await _load_variant_bundle(item.variant_id, session)
        try:
            from app.modules.order.pricing import assert_purchasable, check_stock

            assert_purchasable(product, variant, item.quantity)
            in_stock = True
        except HTTPException:
            in_stock = check_stock(product, variant, item.quantity)

        priced = price_line(product, variant, item.quantity)
        priced_lines.append(priced)

        item_responses.append(
            CartItemResponse(
                id=item.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                variant_name=variant.name,
                sku=variant.sku,
                unit_price=priced.unit_price,
                line_subtotal=priced.line_subtotal,
                primary_image_url=_primary_image(product),
                unit_label=product.unit_label,
                in_stock=in_stock,
                stock_qty=available_qty(variant) if product.track_inventory else None,
                created_at=item.created_at,
                updated_at=item.updated_at,
                created_by=item.created_by,
                updated_by=item.updated_by,
            )
        )

    subtotal, tax_amount, shipping, total = cart_totals(priced_lines)
    item_count = sum(i.quantity for i in cart.items)

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        items=item_responses,
        item_count=item_count,
        subtotal=subtotal,
        tax_amount=tax_amount,
        shipping_amount=shipping,
        total=total,
        currency=CURRENCY,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        created_by=cart.created_by,
        updated_by=cart.updated_by,
    )


async def get_cart(user_id: str, session: AsyncSession) -> CartResponse:
    cart = await _get_or_create_cart(user_id, session)
    return await _build_cart_response(cart, session)


async def add_or_update_item(
    user_id: str,
    variant_id: str | uuid.UUID,
    quantity: int,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> CartResponse:
    vid = _parse_uuid(variant_id, label="variant id")
    variant, product = await _load_variant_bundle(vid, session)
    if product.status != ProductStatus.active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Product is not available")

    from app.modules.order.pricing import assert_purchasable

    assert_purchasable(product, variant, quantity)

    cart = await _get_or_create_cart(user_id, session, actor_id=actor_id)
    existing = next((i for i in cart.items if i.variant_id == vid), None)
    if existing is not None:
        existing.quantity = quantity
        stamp_update(existing, _parse_uuid(actor_id) if actor_id else _parse_uuid(user_id))
    else:
        item = CartItem(cart_id=cart.id, variant_id=vid, quantity=quantity)
        stamp_create(item, _parse_uuid(actor_id) if actor_id else _parse_uuid(user_id))
        session.add(item)
        cart.items.append(item)

    await session.flush()
    await session.refresh(cart, ["items"])
    return await _build_cart_response(cart, session)


async def update_item_quantity(
    user_id: str,
    item_id: str | uuid.UUID,
    quantity: int,
    session: AsyncSession,
    *,
    actor_id: str | uuid.UUID | None = None,
) -> CartResponse:
    iid = _parse_uuid(item_id, label="item id")
    cart = await _get_or_create_cart(user_id, session)
    item = next((i for i in cart.items if i.id == iid), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    variant, product = await _load_variant_bundle(item.variant_id, session)
    from app.modules.order.pricing import assert_purchasable

    assert_purchasable(product, variant, quantity)

    item.quantity = quantity
    stamp_update(item, _parse_uuid(actor_id) if actor_id else _parse_uuid(user_id))
    await session.flush()
    return await _build_cart_response(cart, session)


async def remove_item(
    user_id: str,
    item_id: str | uuid.UUID,
    session: AsyncSession,
) -> CartResponse:
    iid = _parse_uuid(item_id, label="item id")
    cart = await _get_or_create_cart(user_id, session)
    item = next((i for i in cart.items if i.id == iid), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    await session.delete(item)
    cart.items = [i for i in cart.items if i.id != iid]
    await session.flush()
    return await _build_cart_response(cart, session)


async def clear_cart(user_id: str, session: AsyncSession) -> CartResponse:
    cart = await _get_or_create_cart(user_id, session)
    for item in list(cart.items):
        await session.delete(item)
    cart.items = []
    await session.flush()
    return await _build_cart_response(cart, session)


async def get_cart_model(user_id: str, session: AsyncSession) -> Cart:
    return await _get_or_create_cart(user_id, session)
