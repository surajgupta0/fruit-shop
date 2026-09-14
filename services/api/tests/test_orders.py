import uuid
from decimal import Decimal

import pytest


async def _customer_token(client, phone: str = "+919888000001") -> str:
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    assert verify.status_code == 200
    return verify.json()["access_token"]


async def _seed_product(session_factory) -> str:
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
                name="Test Mango",
                slug="test-mango",
                short_description="Juicy",
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
                sku="TEST-MANGO-1",
                name="1 dozen",
                price=Decimal("499"),
                stock_qty=10,
                is_active=True,
                is_default=True,
            )
        )
        await session.commit()
    return str(variant_id)


@pytest.mark.asyncio
async def test_cart_add_and_checkout_cod(client, session_factory):
    variant_id = await _seed_product(session_factory)
    token = await _customer_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    empty = await client.get("/cart", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    cart = await client.post(
        "/cart/items",
        headers=headers,
        json={"variant_id": variant_id, "quantity": 2},
    )
    assert cart.status_code == 200
    body = cart.json()
    assert body["item_count"] == 2
    assert len(body["items"]) == 1
    assert body["subtotal"] == "998.00"

    address = await client.post(
        "/users/me/addresses",
        headers=headers,
        json={
            "label": "home",
            "line1": "12 Orchard Lane",
            "city": "Mumbai",
            "state": "MH",
            "postal_code": "400001",
            "country": "IN",
            "is_default": True,
        },
    )
    assert address.status_code == 201
    address_id = address.json()["id"]

    order = await client.post(
        "/orders/checkout",
        headers=headers,
        json={"address_id": address_id, "payment_method": "cod"},
    )
    assert order.status_code == 201
    order_body = order.json()
    assert order_body["status"] == "confirmed"
    assert order_body["payment_method"] == "cod"
    assert len(order_body["items"]) == 1
    assert order_body["order_number"].startswith("FS-")

    cleared = await client.get("/cart", headers=headers)
    assert cleared.json()["items"] == []

    mine = await client.get("/orders", headers=headers)
    assert mine.status_code == 200
    assert mine.json()["total"] == 1

    payment = await client.get(
        f"/payments/order/{order_body['id']}",
        headers=headers,
    )
    assert payment.status_code == 200
    assert payment.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_admin_lists_orders(client, session_factory, admin_token):
    variant_id = await _seed_product(session_factory)
    token = await _customer_token(client, "+919888000002")
    headers = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/cart/items",
        headers=headers,
        json={"variant_id": variant_id, "quantity": 1},
    )
    address = await client.post(
        "/users/me/addresses",
        headers=headers,
        json={
            "line1": "1 Market Road",
            "city": "Pune",
            "state": "MH",
            "postal_code": "411001",
        },
    )
    await client.post(
        "/orders/checkout",
        headers=headers,
        json={"address_id": address.json()["id"], "payment_method": "cod"},
    )

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    listing = await client.get("/orders/admin/list", headers=admin_headers)
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1
