import uuid
from decimal import Decimal

import pytest


async def _customer_token(client, phone: str = "+919855000001") -> str:
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456", "name": "Review Shopper"},
    )
    assert verify.status_code == 200
    return verify.json()["access_token"]


async def _seed_product(session_factory, *, sku: str = "REVIEW-MANGO-1") -> tuple[str, str]:
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
                name="Review Mango",
                slug=f"review-mango-{sku.lower()}",
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
                price=Decimal("250"),
                stock_qty=20,
                is_active=True,
                is_default=True,
            )
        )
        await session.commit()
    return str(product_id), str(variant_id)


async def _checkout(client, cust: dict, variant_id: str) -> str:
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
            "line1": "12 Review Lane",
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
        json={"address_id": address.json()["id"], "payment_method": "cod"},
    )
    assert order.status_code == 201, order.text
    return order.json()["id"]


async def _mark_delivered(client, admin: dict, order_id: str) -> None:
    for status in ("processing", "shipped", "delivered"):
        if status == "shipped":
            resp = await client.post(
                f"/orders/admin/{order_id}/ship",
                headers=admin,
                json={"carrier": "Delhivery", "tracking_number": "REV123"},
            )
        else:
            resp = await client.patch(
                f"/orders/admin/{order_id}",
                headers=admin,
                json={"status": status},
            )
        assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_review_requires_delivered_order(client, admin_token, session_factory):
    product_id, variant_id = await _seed_product(session_factory)
    token = await _customer_token(client)
    cust = {"Authorization": f"Bearer {token}"}

    blocked = await client.post(
        "/reviews",
        headers=cust,
        json={"product_id": product_id, "rating": 5, "title": "Great", "body": "Tasty"},
    )
    assert blocked.status_code == 403

    await _checkout(client, cust, variant_id)
    still_blocked = await client.post(
        "/reviews",
        headers=cust,
        json={"product_id": product_id, "rating": 5, "title": "Great", "body": "Tasty"},
    )
    assert still_blocked.status_code == 403

    eligibility = await client.get(
        f"/reviews/products/{product_id}/eligibility",
        headers=cust,
    )
    assert eligibility.status_code == 200
    assert eligibility.json()["can_review"] is False


@pytest.mark.asyncio
async def test_review_create_list_moderate_and_product_ratings(
    client, admin_token, session_factory
):
    product_id, variant_id = await _seed_product(session_factory, sku="REVIEW-MANGO-2")
    token = await _customer_token(client, phone="+919855000002")
    cust = {"Authorization": f"Bearer {token}"}
    admin = {"Authorization": f"Bearer {admin_token}"}

    order_id = await _checkout(client, cust, variant_id)
    await _mark_delivered(client, admin, order_id)

    eligible = await client.get(
        f"/reviews/products/{product_id}/eligibility",
        headers=cust,
    )
    assert eligible.status_code == 200
    assert eligible.json()["can_review"] is True

    created = await client.post(
        "/reviews",
        headers=cust,
        json={
            "product_id": product_id,
            "rating": 5,
            "title": "Sweet mango",
            "body": "Perfect ripeness",
        },
    )
    assert created.status_code == 201, created.text
    review = created.json()
    assert review["rating"] == 5
    assert review["status"] == "approved"
    assert review["is_verified_purchase"] is True
    assert review["author_name"] == "Review Shopper"
    review_id = review["id"]

    dup = await client.post(
        "/reviews",
        headers=cust,
        json={"product_id": product_id, "rating": 4, "body": "Again"},
    )
    assert dup.status_code == 409

    public = await client.get(f"/reviews/products/{product_id}")
    assert public.status_code == 200
    assert public.json()["total"] == 1
    assert public.json()["items"][0]["title"] == "Sweet mango"

    summary = await client.get(f"/reviews/products/{product_id}/summary")
    assert summary.status_code == 200
    assert summary.json()["review_count"] == 1
    assert summary.json()["average_rating"] == "5.00"
    assert summary.json()["rating_breakdown"]["5"] == 1

    product = await client.get(f"/catalog/products/{product_id}")
    assert product.status_code == 200
    assert product.json()["average_rating"] == "5.00"
    assert product.json()["review_count"] == 1

    mine = await client.get("/reviews/me", headers=cust)
    assert mine.status_code == 200
    assert mine.json()["total"] == 1

    updated = await client.patch(
        f"/reviews/{review_id}",
        headers=cust,
        json={"rating": 4, "body": "Still good"},
    )
    assert updated.status_code == 200
    assert updated.json()["rating"] == 4

    hidden = await client.patch(
        f"/reviews/admin/{review_id}",
        headers=admin,
        json={"status": "hidden", "admin_note": "Off-topic"},
    )
    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["status"] == "hidden"

    public_after = await client.get(f"/reviews/products/{product_id}")
    assert public_after.json()["total"] == 0

    summary_after = await client.get(f"/reviews/products/{product_id}/summary")
    assert summary_after.json()["review_count"] == 0

    admin_list = await client.get(
        "/reviews/admin",
        headers=admin,
        params={"status": "hidden"},
    )
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] == 1

    deleted = await client.delete(f"/reviews/admin/{review_id}", headers=admin)
    assert deleted.status_code == 204
