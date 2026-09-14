import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select


async def _customer_token(client, phone: str = "+919877000111") -> str:
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    assert verify.status_code == 200
    return verify.json()["access_token"]


async def _seed_product(session_factory, *, stock: int = 10, sku: str = "INV-MANGO-1"):
    from app.modules.catalog.models import (
        Product,
        ProductStatus,
        ProductType,
        ProductVariant,
        ProductVisibility,
    )

    product_id = uuid.uuid4()
    variant_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(
            Product(
                id=product_id,
                name="Inventory Mango",
                slug=f"inventory-mango-{variant_id.hex[:8]}",
                short_description="Stocked",
                status=ProductStatus.active,
                visibility=ProductVisibility.visible,
                product_type=ProductType.simple,
                is_taxable=True,
                tax_percent=Decimal("5"),
                track_inventory=True,
                min_order_qty=1,
            )
        )
        session.add(
            ProductVariant(
                id=variant_id,
                product_id=product_id,
                sku=sku,
                name="1 kg",
                price=Decimal("199"),
                stock_qty=stock,
                reserved_qty=0,
                low_stock_threshold=5,
                is_active=True,
                is_default=True,
            )
        )
        await session.commit()
    return str(product_id), str(variant_id)


@pytest.mark.asyncio
async def test_inventory_admin_adjust_and_levels(client, admin_token, session_factory):
    _, variant_id = await _seed_product(session_factory, stock=8)
    headers = {"Authorization": f"Bearer {admin_token}"}

    levels = await client.get("/inventory/admin/levels", headers=headers)
    assert levels.status_code == 200
    assert levels.json()["total"] >= 1

    adjust = await client.post(
        "/inventory/admin/adjust",
        headers=headers,
        json={
            "variant_id": variant_id,
            "delta": -3,
            "reason": "Damaged fruit",
            "note": "Soft spots",
        },
    )
    assert adjust.status_code == 200
    body = adjust.json()
    assert body["stock_qty"] == 5
    assert body["available_qty"] == 5
    assert body["is_low_stock"] is True

    receive = await client.post(
        "/inventory/admin/receive",
        headers=headers,
        json={"variant_id": variant_id, "quantity": 10, "reason": "Supplier delivery"},
    )
    assert receive.status_code == 200
    assert receive.json()["stock_qty"] == 15

    movements = await client.get(
        f"/inventory/admin/movements?variant_id={variant_id}",
        headers=headers,
    )
    assert movements.status_code == 200
    assert movements.json()["total"] >= 2

    low = await client.get("/inventory/admin/low-stock", headers=headers)
    assert low.status_code == 200


@pytest.mark.asyncio
async def test_checkout_deducts_and_cancel_restores(client, session_factory):
    from app.modules.catalog.models import ProductVariant
    from app.modules.inventory.models import InventoryMovement

    _, variant_id = await _seed_product(
        session_factory, stock=5, sku="INV-CHECKOUT-1"
    )
    token = await _customer_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/cart/items",
        headers=headers,
        json={"variant_id": variant_id, "quantity": 2},
    )
    address = await client.post(
        "/users/me/addresses",
        headers=headers,
        json={
            "label": "home",
            "line1": "1 Grove",
            "city": "Pune",
            "state": "MH",
            "postal_code": "411001",
            "country": "IN",
            "is_default": True,
        },
    )
    assert address.status_code == 201
    order = await client.post(
        "/orders/checkout",
        headers=headers,
        json={"address_id": address.json()["id"], "payment_method": "cod"},
    )
    assert order.status_code == 201
    order_id = order.json()["id"]

    async with session_factory() as session:
        variant = await session.get(ProductVariant, uuid.UUID(variant_id))
        assert variant.stock_qty == 3
        sales = (
            await session.execute(
                select(InventoryMovement).where(
                    InventoryMovement.reference_id == uuid.UUID(order_id)
                )
            )
        ).scalars().all()
        assert any(
            (m.movement_type.value if hasattr(m.movement_type, "value") else m.movement_type)
            == "sale"
            for m in sales
        )

    cancel = await client.post(
        f"/orders/{order_id}/cancel",
        headers=headers,
        json={"reason": "changed mind"},
    )
    assert cancel.status_code == 200

    async with session_factory() as session:
        variant = await session.get(ProductVariant, uuid.UUID(variant_id))
        assert variant.stock_qty == 5

    cancel2 = await client.post(
        f"/orders/{order_id}/cancel",
        headers=headers,
        json={"reason": "again"},
    )
    assert cancel2.status_code == 400

    async with session_factory() as session:
        variant = await session.get(ProductVariant, uuid.UUID(variant_id))
        assert variant.stock_qty == 5


@pytest.mark.asyncio
async def test_checkout_blocks_when_insufficient_stock(client, session_factory):
    _, variant_id = await _seed_product(
        session_factory, stock=1, sku="INV-LOW-1"
    )
    token = await _customer_token(client, phone="+919877000222")
    headers = {"Authorization": f"Bearer {token}"}

    cart = await client.post(
        "/cart/items",
        headers=headers,
        json={"variant_id": variant_id, "quantity": 3},
    )
    address = await client.post(
        "/users/me/addresses",
        headers=headers,
        json={
            "label": "home",
            "line1": "2 Grove",
            "city": "Pune",
            "state": "MH",
            "postal_code": "411001",
            "country": "IN",
            "is_default": True,
        },
    )
    if cart.status_code == 200:
        order = await client.post(
            "/orders/checkout",
            headers=headers,
            json={"address_id": address.json()["id"], "payment_method": "cod"},
        )
        assert order.status_code == 400
