import uuid
from decimal import Decimal

import pytest


@pytest.mark.asyncio
async def test_public_catalog_list_and_slug(client, admin_token, session_factory):
    headers = {"Authorization": f"Bearer {admin_token}"}

    brand = await client.post(
        "/catalog/admin/brands",
        headers=headers,
        json={"name": "Orchard Co", "slug": "orchard-co"},
    )
    assert brand.status_code == 201
    brand_id = brand.json()["id"]

    category = await client.post(
        "/catalog/admin/categories",
        headers=headers,
        json={"name": "Mangoes", "slug": "mangoes-test"},
    )
    assert category.status_code == 201
    category_id = category.json()["id"]

    tag = await client.post(
        "/catalog/admin/tags",
        headers=headers,
        json={"name": "Organic Test", "slug": "organic-test"},
    )
    assert tag.status_code == 201
    tag_id = tag.json()["id"]

    created = await client.post(
        "/catalog/admin/products",
        headers=headers,
        json={
            "name": "Alphonso Box",
            "slug": "alphonso-box-test",
            "category_id": category_id,
            "brand_id": brand_id,
            "status": "draft",
            "tag_ids": [tag_id],
            "variants": [
                {
                    "sku": "ALP-BOX-1",
                    "name": "1 dozen",
                    "price": "599.00",
                    "stock_qty": 8,
                    "is_default": True,
                }
            ],
            "attributes": [{"name": "Origin", "value": "Ratnagiri"}],
            "options": [
                {
                    "name": "Pack",
                    "position": 1,
                    "values": [{"value": "1 dozen", "sort_order": 0}],
                }
            ],
            "images": [
                {
                    "url": "https://example.com/mango.jpg",
                    "is_primary": True,
                    "sort_order": 0,
                }
            ],
        },
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]
    assert created.json()["status"] == "draft"
    assert len(created.json()["options"]) == 1

    published = await client.post(
        f"/catalog/admin/products/{product_id}/publish",
        headers=headers,
        json={},
    )
    assert published.status_code == 200
    assert published.json()["status"] == "active"
    assert published.json()["published_at"] is not None

    by_slug = await client.get("/catalog/products/by-slug/alphonso-box-test")
    assert by_slug.status_code == 200
    assert by_slug.json()["name"] == "Alphonso Box"

    cat_slug = await client.get("/catalog/categories/by-slug/mangoes-test")
    assert cat_slug.status_code == 200
    assert cat_slug.json()["id"] == category_id

    brand_slug = await client.get("/catalog/brands/by-slug/orchard-co")
    assert brand_slug.status_code == 200
    assert brand_slug.json()["id"] == brand_id

    tag_slug = await client.get("/catalog/tags/by-slug/organic-test")
    assert tag_slug.status_code == 200

    listed = await client.get("/catalog/products", params={"tag": "organic-test"})
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    item = next(i for i in listed.json()["items"] if i["slug"] == "alphonso-box-test")
    assert item["in_stock"] is True
    assert item["total_stock"] == 8


@pytest.mark.asyncio
async def test_product_options_and_image_reorder(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    created = await client.post(
        "/catalog/admin/products",
        headers=headers,
        json={
            "name": "Kiwi Pack",
            "slug": "kiwi-pack-test",
            "status": "active",
            "variants": [
                {
                    "sku": "KIWI-1",
                    "name": "Default",
                    "price": "199.00",
                    "stock_qty": 3,
                    "is_default": True,
                }
            ],
            "images": [
                {"url": "https://example.com/a.jpg", "sort_order": 0, "is_primary": True},
                {"url": "https://example.com/b.jpg", "sort_order": 1, "is_primary": False},
            ],
        },
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]
    images = created.json()["images"]
    assert len(images) == 2

    option = await client.post(
        f"/catalog/admin/products/{product_id}/options",
        headers=headers,
        json={
            "name": "Size",
            "position": 1,
            "values": [{"value": "Small"}, {"value": "Large"}],
        },
    )
    assert option.status_code == 201, option.text
    option_id = option.json()["id"]
    assert len(option.json()["values"]) == 2

    value = await client.post(
        f"/catalog/admin/products/{product_id}/options/{option_id}/values",
        headers=headers,
        json={"value": "Medium", "sort_order": 1},
    )
    assert value.status_code == 201

    reordered = await client.post(
        f"/catalog/admin/products/{product_id}/images/reorder",
        headers=headers,
        json={
            "images": [
                {"id": images[1]["id"], "sort_order": 0, "is_primary": True},
                {"id": images[0]["id"], "sort_order": 1, "is_primary": False},
            ]
        },
    )
    assert reordered.status_code == 200
    body = reordered.json()
    primary = next(i for i in body if i["is_primary"])
    assert primary["id"] == images[1]["id"]

    unpublished = await client.post(
        f"/catalog/admin/products/{product_id}/unpublish",
        headers=headers,
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["status"] == "draft"

    public = await client.get("/catalog/products/by-slug/kiwi-pack-test")
    assert public.status_code == 404


@pytest.mark.asyncio
async def test_admin_tags_list(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        "/catalog/admin/tags",
        headers=headers,
        json={"name": "Gift", "slug": "gift-admin-list"},
    )
    listed = await client.get("/catalog/admin/tags", headers=headers)
    assert listed.status_code == 200
    assert any(t["slug"] == "gift-admin-list" for t in listed.json())
