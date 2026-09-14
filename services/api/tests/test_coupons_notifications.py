import uuid
from decimal import Decimal

import pytest


async def _customer_token(client, phone: str = "+919877000001") -> str:
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "name": "Coupon Shopper"},
    )
    assert verify.status_code == 200
    return verify.json()["access_token"]


async def _seed_product(session_factory, *, sku: str = "COUPON-MANGO-1") -> str:
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
                name="Coupon Mango",
                slug=f"coupon-mango-{sku.lower()}",
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
                price=Decimal("500"),
                stock_qty=20,
                is_active=True,
                is_default=True,
            )
        )
        await session.commit()
    return str(variant_id)


@pytest.mark.asyncio
async def test_admin_coupon_crud_and_checkout_discount(client, admin_token, session_factory):
    headers = {"Authorization": f"Bearer {admin_token}"}
    created = await client.post(
        "/coupons/admin",
        headers=headers,
        json={
            "code": "fresh10",
            "name": "10% off",
            "discount_type": "percent",
            "percent_off": "10",
            "min_subtotal": "0",
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["code"] == "FRESH10"

    variant_id = await _seed_product(session_factory)
    token = await _customer_token(client)
    cust = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/cart/items",
        headers=cust,
        json={"variant_id": variant_id, "quantity": 2},
    )
    preview = await client.post(
        "/coupons/validate",
        headers=cust,
        json={"code": "FRESH10"},
    )
    assert preview.status_code == 200
    assert preview.json()["valid"] is True
    assert preview.json()["discount_amount"] == "100.00"

    address = await client.post(
        "/users/me/addresses",
        headers=cust,
        json={
            "label": "home",
            "line1": "1 Market Road",
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
        headers=cust,
        json={
            "address_id": address.json()["id"],
            "payment_method": "cod",
            "coupon_code": "FRESH10",
        },
    )
    assert order.status_code == 201, order.text
    body = order.json()
    assert body["coupon_code"] == "FRESH10"
    assert body["discount_amount"] == "100.00"
    # subtotal 1000, shipping 0 (threshold 999), discount 100 → 900
    assert body["total"] == "900.00"
    assert body["status"] == "confirmed"

    listed = await client.get("/coupons/admin", headers=headers)
    assert listed.status_code == 200
    coupon = next(c for c in listed.json()["items"] if c["code"] == "FRESH10")
    assert coupon["usage_count"] == 1


@pytest.mark.asyncio
async def test_fixed_coupon_and_cancel_releases_usage(client, admin_token, session_factory):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        "/coupons/admin",
        headers=headers,
        json={
            "code": "SAVE50",
            "name": "Flat 50",
            "discount_type": "fixed",
            "amount_off": "50",
            "usage_limit": 5,
            "per_user_limit": 1,
        },
    )

    variant_id = await _seed_product(session_factory, sku="COUPON-FIXED-1")
    token = await _customer_token(client, phone="+919877000002")
    cust = {"Authorization": f"Bearer {token}"}

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
            "line1": "2 Lane",
            "city": "Mumbai",
            "state": "MH",
            "postal_code": "400001",
            "country": "IN",
            "is_default": True,
        },
    )
    order = await client.post(
        "/orders/checkout",
        headers=cust,
        json={
            "address_id": address.json()["id"],
            "payment_method": "cod",
            "coupon_code": "SAVE50",
        },
    )
    assert order.status_code == 201
    assert order.json()["discount_amount"] == "50.00"
    order_id = order.json()["id"]

    cancelled = await client.post(
        f"/orders/{order_id}/cancel",
        headers=cust,
        json={"reason": "Changed mind"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    listed = await client.get("/coupons/admin", headers=headers)
    coupon = next(c for c in listed.json()["items"] if c["code"] == "SAVE50")
    assert coupon["usage_count"] == 0


@pytest.mark.asyncio
async def test_order_status_notifications_logged(client, admin_token, session_factory):
    variant_id = await _seed_product(session_factory, sku="NOTIFY-1")
    token = await _customer_token(client, phone="+919877000003")
    cust = {"Authorization": f"Bearer {token}"}

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
            "line1": "3 Lane",
            "city": "Delhi",
            "state": "DL",
            "postal_code": "110001",
            "country": "IN",
            "is_default": True,
        },
    )
    order = await client.post(
        "/orders/checkout",
        headers=cust,
        json={"address_id": address.json()["id"], "payment_method": "cod"},
    )
    assert order.status_code == 201
    order_id = order.json()["id"]

    admin = {"Authorization": f"Bearer {admin_token}"}
    shipped = await client.patch(
        f"/orders/admin/{order_id}",
        headers=admin,
        json={"status": "processing"},
    )
    assert shipped.status_code == 200
    shipped = await client.post(
        f"/orders/admin/{order_id}/ship",
        headers=admin,
        json={"carrier": "Delhivery", "tracking_number": "DLV123"},
    )
    assert shipped.status_code == 200

    logs = await client.get(
        "/notifications/admin/logs",
        headers=admin,
        params={"order_id": order_id},
    )
    assert logs.status_code == 200
    events = {row["event"] for row in logs.json()["items"]}
    assert "order_confirmed" in events
    assert "order_shipped" in events
    assert any(row["channel"] == "sms" for row in logs.json()["items"])


@pytest.mark.asyncio
async def test_available_coupons_for_cart(client, admin_token, session_factory):
    admin = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        "/coupons/admin",
        headers=admin,
        json={
            "code": "LIST10",
            "name": "Listable 10%",
            "discount_type": "percent",
            "percent_off": "10",
            "min_subtotal": "0",
            "is_active": True,
        },
    )
    await client.post(
        "/coupons/admin",
        headers=admin,
        json={
            "code": "BIGCART",
            "name": "Needs big cart",
            "discount_type": "fixed",
            "amount_off": "100",
            "min_subtotal": "5000",
            "is_active": True,
        },
    )

    variant_id = await _seed_product(session_factory, sku="AVAIL-1")
    token = await _customer_token(client, phone="+919877000099")
    cust = {"Authorization": f"Bearer {token}"}
    await client.post(
        "/cart/items",
        headers=cust,
        json={"variant_id": variant_id, "quantity": 1},
    )

    available = await client.get("/coupons/available", headers=cust)
    assert available.status_code == 200, available.text
    body = available.json()
    codes = {item["code"]: item for item in body["items"]}
    assert "LIST10" in codes
    assert codes["LIST10"]["applicable"] is True
    assert codes["LIST10"]["estimated_discount"] == "50.00"
    assert "BIGCART" in codes
    assert codes["BIGCART"]["applicable"] is False
    assert "₹5000" in (codes["BIGCART"]["reason"] or "")
