import uuid
from decimal import Decimal

import pytest


async def _customer_token(client, phone: str = "+919866000001") -> str:
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "name": "Fulfil Shopper"},
    )
    assert verify.status_code == 200
    return verify.json()["access_token"]


async def _seed_product(session_factory, *, sku: str = "FULFIL-1") -> str:
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
                name="Fulfil Mango",
                slug=f"fulfil-mango-{sku.lower()}",
                status=ProductStatus.active,
                visibility=ProductVisibility.visible,
                product_type=ProductType.simple,
                is_taxable=False,
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
                price=Decimal("200"),
                stock_qty=20,
                is_active=True,
                is_default=True,
            )
        )
        await session.commit()
    return str(variant_id)


@pytest.mark.asyncio
async def test_fulfillment_timeline_and_ship(client, admin_token, session_factory):
    variant_id = await _seed_product(session_factory)
    token = await _customer_token(client)
    cust = {"Authorization": f"Bearer {token}"}
    admin = {"Authorization": f"Bearer {admin_token}"}

    await client.post(
        "/cart/items",
        headers=cust,
        json={"variant_id": variant_id, "quantity": 1},
    )
    address = await client.post(
        "/users/me/addresses",
        headers=cust,
        json={
            "label": "home",
            "line1": "9 Pack Street",
            "city": "Pune",
            "state": "MH",
            "postal_code": "411001",
            "country": "IN",
            "is_default": True,
        },
    )
    key = str(uuid.uuid4())
    order = await client.post(
        "/orders/checkout",
        headers=cust,
        json={
            "address_id": address.json()["id"],
            "payment_method": "cod",
            "idempotency_key": key,
        },
    )
    assert order.status_code == 201
    order_id = order.json()["id"]
    assert order.json()["timeline"]
    assert order.json()["timeline"][0]["to_status"] == "confirmed"
    assert order.json()["can_cancel"] is True
    assert "internal_notes" not in order.json() or order.json()["internal_notes"] is None

    # Idempotent replay
    again = await client.post(
        "/orders/checkout",
        headers=cust,
        json={
            "address_id": address.json()["id"],
            "payment_method": "cod",
            "idempotency_key": key,
        },
    )
    assert again.status_code == 201
    assert again.json()["id"] == order_id

    # Illegal jump
    bad = await client.patch(
        f"/orders/admin/{order_id}",
        headers=admin,
        json={"status": "shipped"},
    )
    assert bad.status_code == 400

    proc = await client.patch(
        f"/orders/admin/{order_id}",
        headers=admin,
        json={"status": "processing"},
    )
    assert proc.status_code == 200
    assert "shipped" in proc.json()["next_actions"]

    note = await client.post(
        f"/orders/admin/{order_id}/notes",
        headers=admin,
        json={"note": "Fragile box"},
    )
    assert note.status_code == 200
    assert note.json()["internal_notes"] == "Fragile box"

    shipped = await client.post(
        f"/orders/admin/{order_id}/ship",
        headers=admin,
        json={"carrier": "Delhivery", "tracking_number": "DLV999"},
    )
    assert shipped.status_code == 200
    assert shipped.json()["status"] == "shipped"
    assert shipped.json()["tracking_number"] == "DLV999"
    assert shipped.json()["shipped_at"]

    mine = await client.get(f"/orders/{order_id}", headers=cust)
    assert mine.status_code == 200
    assert mine.json()["tracking_number"] == "DLV999"
    assert mine.json()["internal_notes"] is None
    assert mine.json()["can_cancel"] is False
    assert len(mine.json()["timeline"]) >= 3
