import pytest


@pytest.mark.asyncio
async def test_cms_banners_pages_blocks_snippets(client, admin_token):
    admin = {"Authorization": f"Bearer {admin_token}"}

    # --- Banners ---
    created_banner = await client.post(
        "/cms/admin/banners",
        headers=admin,
        json={
            "placement": "home_hero",
            "label": "In season",
            "title": "Fresh mangoes",
            "description": "Hand-picked this week",
            "image_url": "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=1200",
            "primary_href": "/shop",
            "primary_label": "Shop now",
            "sort_order": 1,
            "is_active": True,
        },
    )
    assert created_banner.status_code == 201, created_banner.text
    banner_id = created_banner.json()["id"]

    public_banners = await client.get("/cms/banners", params={"placement": "home_hero"})
    assert public_banners.status_code == 200
    assert len(public_banners.json()) >= 1
    assert public_banners.json()[0]["title"] == "Fresh mangoes"

    inactive = await client.patch(
        f"/cms/admin/banners/{banner_id}",
        headers=admin,
        json={"is_active": False},
    )
    assert inactive.status_code == 200
    public_after = await client.get("/cms/banners", params={"placement": "home_hero"})
    assert all(b["id"] != banner_id for b in public_after.json())

    # --- Pages + blocks ---
    created_page = await client.post(
        "/cms/admin/pages",
        headers=admin,
        json={
            "title": "About Fruit Shop",
            "slug": "about",
            "status": "published",
            "excerpt": "Our story",
            "blocks": [
                {
                    "block_type": "rich_text",
                    "heading": "Who we are",
                    "body": "We deliver fresh fruit.",
                    "sort_order": 0,
                },
                {
                    "block_type": "cta",
                    "heading": "Shop today",
                    "href": "/shop",
                    "href_label": "Browse",
                    "sort_order": 1,
                },
            ],
        },
    )
    assert created_page.status_code == 201, created_page.text
    page = created_page.json()
    page_id = page["id"]
    assert page["slug"] == "about"
    assert len(page["blocks"]) == 2

    public_page = await client.get("/cms/pages/by-slug/about")
    assert public_page.status_code == 200
    assert public_page.json()["title"] == "About Fruit Shop"
    assert len(public_page.json()["blocks"]) == 2

    draft = await client.patch(
        f"/cms/admin/pages/{page_id}",
        headers=admin,
        json={"status": "draft"},
    )
    assert draft.status_code == 200
    hidden = await client.get("/cms/pages/by-slug/about")
    assert hidden.status_code == 404

    await client.patch(
        f"/cms/admin/pages/{page_id}",
        headers=admin,
        json={"status": "published"},
    )

    block = await client.post(
        f"/cms/admin/pages/{page_id}/blocks",
        headers=admin,
        json={
            "block_type": "image",
            "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800",
            "image_alt": "Fruit bowl",
            "sort_order": 2,
        },
    )
    assert block.status_code == 201, block.text
    block_id = block.json()["id"]

    reordered = await client.put(
        f"/cms/admin/pages/{page_id}/blocks/reorder",
        headers=admin,
        json={
            "blocks": [
                {"id": block_id, "sort_order": 0},
                {"id": page["blocks"][0]["id"], "sort_order": 1},
                {"id": page["blocks"][1]["id"], "sort_order": 2},
            ]
        },
    )
    assert reordered.status_code == 200, reordered.text
    assert reordered.json()["blocks"][0]["id"] == block_id

    deleted_block = await client.delete(
        f"/cms/admin/blocks/{block_id}",
        headers=admin,
    )
    assert deleted_block.status_code == 204

    # --- Snippets ---
    snippet = await client.post(
        "/cms/admin/snippets",
        headers=admin,
        json={
            "key": "announcement_bar",
            "title": "Free shipping",
            "body": "Free delivery over ₹999",
            "href": "/shop",
            "href_label": "Shop",
            "is_active": True,
        },
    )
    assert snippet.status_code == 201, snippet.text

    by_key = await client.get("/cms/snippets/by-key/announcement_bar")
    assert by_key.status_code == 200
    assert by_key.json()["title"] == "Free shipping"

    listed = await client.get("/cms/snippets", params={"keys": "announcement_bar"})
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    admin_list = await client.get("/cms/admin/snippets", headers=admin)
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] >= 1

    # cleanup
    await client.delete(f"/cms/admin/banners/{banner_id}", headers=admin)
    await client.delete(f"/cms/admin/pages/{page_id}", headers=admin)
    await client.delete(f"/cms/admin/snippets/{snippet.json()['id']}", headers=admin)


@pytest.mark.asyncio
async def test_cms_admin_requires_permission(client):
    denied = await client.get("/cms/admin/banners")
    assert denied.status_code == 401
