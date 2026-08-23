"""Seed storefront catalog: categories with images, tags, brands, products

Revision ID: 006_seed_catalog
Revises: 005_catalog_full
Create Date: 2026-08-23
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_seed_catalog"
down_revision: Union[str, None] = "005_catalog_full"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CAT = {
    "mangoes": "a1000000-0000-4000-8000-000000000001",
    "exotic": "a1000000-0000-4000-8000-000000000002",
    "seasonal": "a1000000-0000-4000-8000-000000000003",
    "citrus": "a1000000-0000-4000-8000-000000000004",
    "berries": "a1000000-0000-4000-8000-000000000005",
    "gifts": "a1000000-0000-4000-8000-000000000006",
}
BRAND = {
    "orchard": "b1000000-0000-4000-8000-000000000001",
    "konkan": "b1000000-0000-4000-8000-000000000002",
}
TAG = {
    "organic": "c1000000-0000-4000-8000-000000000001",
    "imported": "c1000000-0000-4000-8000-000000000002",
    "gift": "c1000000-0000-4000-8000-000000000003",
    "seasonal": "c1000000-0000-4000-8000-000000000004",
    "bestseller": "c1000000-0000-4000-8000-000000000005",
}


def upgrade() -> None:
    conn = op.get_bind()
    if conn.execute(sa.text("SELECT 1 FROM products WHERE slug = 'ratnagiri-alphonso-mango' LIMIT 1")).scalar():
        return

    # Replace any prior demo catalog so homepage seed is complete & visual
    conn.execute(sa.text("DELETE FROM product_tags"))
    conn.execute(sa.text("DELETE FROM product_images"))
    conn.execute(sa.text("DELETE FROM product_variants"))
    conn.execute(sa.text("DELETE FROM product_attributes"))
    conn.execute(sa.text("DELETE FROM product_options"))
    conn.execute(sa.text("DELETE FROM product_relations"))
    conn.execute(sa.text("DELETE FROM products"))
    conn.execute(sa.text("DELETE FROM tags"))
    conn.execute(sa.text("DELETE FROM categories"))
    conn.execute(sa.text("DELETE FROM brands"))

    conn.execute(sa.text("""
        INSERT INTO brands (id, name, slug, description, is_active, created_at, updated_at) VALUES
        (:b1, 'Orchard Fresh', 'orchard-fresh', 'Hand-picked seasonal fruit', true, now(), now()),
        (:b2, 'Konkan Gold', 'konkan-gold', 'Ratnagiri & Devgad Alphonso specialists', true, now(), now())
    """), {"b1": BRAND["orchard"], "b2": BRAND["konkan"]})

    cats = [
        (CAT["mangoes"], "Mangoes", "mangoes", "Alphonso, Kesar, Hapus — peak season sweetness",
         "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80", 1),
        (CAT["exotic"], "Exotic Fruits", "exotic-fruits", "Imported cherries, dragon fruit, kiwi & more",
         "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80", 2),
        (CAT["seasonal"], "Seasonal Picks", "seasonal-picks", "What\'s ripe right now",
         "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80", 3),
        (CAT["citrus"], "Citrus", "citrus", "Oranges, mosambi, and zesty classics",
         "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80", 4),
        (CAT["berries"], "Berries", "berries", "Strawberries, blueberries, and ruby reds",
         "https://images.unsplash.com/photo-1464454709131-ffd692591ee5?auto=format&fit=crop&w=800&q=80", 5),
        (CAT["gifts"], "Gift Hampers", "gift-hampers", "Curated boxes for celebrations",
         "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80", 6),
    ]
    for cid, name, slug, desc, img, sort in cats:
        conn.execute(sa.text("""
            INSERT INTO categories (id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at)
            VALUES (:id, :name, :slug, :desc, :img, :sort, true, now(), now())
        """), {"id": cid, "name": name, "slug": slug, "desc": desc, "img": img, "sort": sort})

    for tid, name, slug in [
        (TAG["organic"], "Organic", "organic"),
        (TAG["imported"], "Imported", "imported"),
        (TAG["gift"], "Gift Ready", "gift-ready"),
        (TAG["seasonal"], "Seasonal", "seasonal"),
        (TAG["bestseller"], "Bestseller", "bestseller"),
    ]:
        conn.execute(sa.text("""
            INSERT INTO tags (id, name, slug, created_at, updated_at) VALUES (:id, :name, :slug, now(), now())
        """), {"id": tid, "name": name, "slug": slug})

    products = [
        ("d1000000-0000-4000-8000-000000000001", "Ratnagiri Alphonso Mango", "ratnagiri-alphonso-mango",
         "GI-tagged Hapus — buttery, fragrant, dessert-ready.",
         "Sourced from Ratnagiri orchards. Naturally ripened for classic Alphonso aroma.",
         CAT["mangoes"], BRAND["konkan"], True, True, "Season\'s best", "dozen", "Ratnagiri", 5,
         "Ripen at room temperature; chill briefly before serving.",
         "https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=1200&q=80",
         "ALP-DOZ-01", 1899, 2299, 48, ["organic", "bestseller", "seasonal"]),
        ("d1000000-0000-4000-8000-000000000002", "Devgad Alphonso (Premium)", "devgad-alphonso-premium",
         "Gift-grade Devgad Hapus — deep colour, thick pulp.",
         "Hand-graded Devgad Alphonso packed for gifting.",
         CAT["mangoes"], BRAND["konkan"], True, False, "Gift grade", "box of 6", "Devgad", 5,
         "Keep cool and dry; enjoy within a few days of ripeness.",
         "https://images.unsplash.com/photo-1601493700631-ac69cf5b0fad?auto=format&fit=crop&w=1200&q=80",
         "ALP-BOX-06", 1499, 1699, 30, ["gift", "bestseller"]),
        ("d1000000-0000-4000-8000-000000000003", "Kesar Mango", "kesar-mango",
         "Saffron-hued Kesar — sweet with a gentle tang.",
         "Bright pulp, perfect for aamras and fresh eating.",
         CAT["mangoes"], BRAND["orchard"], False, True, None, "kg", "Gir", 6,
         "Ripen covered at room temperature.",
         "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80",
         "KES-KG-01", 499, 599, 80, ["organic", "seasonal"]),
        ("d1000000-0000-4000-8000-000000000004", "Imported Cherries (Class-1)", "imported-cherries-class-1",
         "Crisp, juicy cherries — cold-chain packed.",
         "Premium imported cherries selected for size and sweetness.",
         CAT["exotic"], BRAND["orchard"], True, False, "Imported", "250g", "Imported", 4,
         "Refrigerate immediately. Rinse before eating.",
         "https://images.unsplash.com/photo-1528821128474-27f963b867d0?auto=format&fit=crop&w=1200&q=80",
         "CHR-250-01", 899, 999, 40, ["imported", "bestseller"]),
        ("d1000000-0000-4000-8000-000000000005", "Dragon Fruit (Pink Flesh)", "dragon-fruit-pink",
         "Vibrant pink flesh with mild sweetness.",
         "Ripe pink-flesh dragon fruit. Scoop and chill.",
         CAT["exotic"], BRAND["orchard"], False, False, None, "piece", "India", 5,
         "Keep refrigerated once ripe.",
         "https://images.unsplash.com/photo-1527325678964-549284ba87cd?auto=format&fit=crop&w=1200&q=80",
         "DRG-PNK-01", 149, 199, 100, ["seasonal"]),
        ("d1000000-0000-4000-8000-000000000006", "Zespri Green Kiwi", "zespri-green-kiwi",
         "Tangy-sweet kiwi — vitamin C packed.",
         "Classic green kiwi for breakfast bowls.",
         CAT["exotic"], BRAND["orchard"], False, False, None, "pack of 4", "New Zealand", 7,
         "Ripen at room temp; refrigerate when soft.",
         "https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=1200&q=80",
         "KIW-GRN-04", 249, 299, 60, ["imported"]),
        ("d1000000-0000-4000-8000-000000000007", "Mahabaleshwar Strawberries", "mahabaleshwar-strawberries",
         "Hill-station strawberries — fragrant and juicy.",
         "Packed the same morning for peak aroma.",
         CAT["berries"], BRAND["orchard"], True, True, "Farm fresh", "200g", "Mahabaleshwar", 3,
         "Refrigerate. Consume within 1–2 days.",
         "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1200&q=80",
         "STR-200-01", 399, 499, 35, ["organic", "seasonal", "bestseller"]),
        ("d1000000-0000-4000-8000-000000000008", "Blueberry Punnet", "blueberry-punnet",
         "Plump blueberries for snacking and bowls.",
         "Ready-to-eat blueberries with a pop of freshness.",
         CAT["berries"], BRAND["orchard"], False, False, None, "125g", "Imported", 5,
         "Keep chilled. Do not wash until serving.",
         "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=1200&q=80",
         "BLU-125-01", 349, 399, 45, ["imported"]),
        ("d1000000-0000-4000-8000-000000000009", "Nagpur Oranges", "nagpur-oranges",
         "Juicy, easy-peel oranges from Nagpur.",
         "Bright segments for juice or snacking.",
         CAT["citrus"], BRAND["orchard"], False, False, None, "kg", "Nagpur", 8,
         "Cool, dry place.",
         "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=1200&q=80",
         "ORG-KG-01", 129, 159, 120, ["seasonal"]),
        ("d1000000-0000-4000-8000-000000000010", "Fruit Gift Hamper", "fruit-gift-hamper",
         "Curated premium fruit — ready to gift.",
         "Seasonal assortment in a gift-ready box.",
         CAT["gifts"], BRAND["orchard"], True, False, "Gift box", "hamper", "India", 3,
         "Keep cool; enjoy promptly.",
         "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=1200&q=80",
         "GFT-HAM-01", 2499, 2999, 20, ["gift", "bestseller"]),
        ("d1000000-0000-4000-8000-000000000011", "Hass Avocado", "hass-avocado",
         "Creamy Hass avocados — toast-ready.",
         "Rich, buttery flesh when ripe.",
         CAT["exotic"], BRAND["orchard"], False, False, None, "piece", "Imported", 4,
         "Ripen at room temperature; refrigerate when soft.",
         "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1200&q=80",
         "AVO-HAS-01", 179, 219, 70, ["imported"]),
        ("d1000000-0000-4000-8000-000000000012", "Pomegranate (Bhagawa)", "pomegranate-bhagawa",
         "Ruby arils, naturally sweet.",
         "Deep red arils for juice and salads.",
         CAT["seasonal"], BRAND["orchard"], False, True, None, "kg", "Solapur", 10,
         "Store cool and dry.",
         "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=1200&q=80",
         "POM-KG-01", 199, 249, 90, ["organic", "seasonal"]),
    ]

    for (pid, name, slug, short, desc, cat, brand, featured, organic, badge, unit, origin, shelf,
         storage, img, sku, price, compare, stock, tags) in products:
        conn.execute(sa.text("""
            INSERT INTO products (
              id, category_id, brand_id, name, slug, short_description, description,
              product_type, status, visibility,
              is_featured, is_organic, is_perishable, is_taxable, requires_shipping, track_inventory,
              unit_label, badge_label, origin_region, shelf_life_days, storage_instructions,
              min_order_qty, order_qty_increment, sort_order, published_at, created_at, updated_at
            ) VALUES (
              :id, :cat, :brand, :name, :slug, :short, :desc,
              \'simple\', \'active\', \'visible\',
              :featured, :organic, true, true, true, true,
              :unit, :badge, :origin, :shelf, :storage,
              1, 1, 0, now(), now(), now()
            )
        """), {
            "id": pid, "cat": cat, "brand": brand, "name": name, "slug": slug,
            "short": short, "desc": desc, "featured": featured, "organic": organic,
            "unit": unit, "badge": badge, "origin": origin, "shelf": shelf, "storage": storage,
        })
        conn.execute(sa.text("""
            INSERT INTO product_images (id, product_id, url, alt_text, media_type, sort_order, is_primary, created_at, updated_at)
            VALUES (:id, :pid, :url, :alt, \'image\', 0, true, now(), now())
        """), {"id": str(uuid.uuid4()), "pid": pid, "url": img, "alt": name})
        conn.execute(sa.text("""
            INSERT INTO product_variants (
              id, product_id, sku, name, price, compare_at_price,
              is_default, is_active, sort_order, stock_qty, low_stock_threshold, inventory_policy, created_at, updated_at
            ) VALUES (
              :id, :pid, :sku, \'Default\', :price, :compare,
              true, true, 0, :stock, 5, \'deny\', now(), now()
            )
        """), {"id": str(uuid.uuid4()), "pid": pid, "sku": sku, "price": price, "compare": compare, "stock": stock})
        for t in tags:
            conn.execute(sa.text("""
                INSERT INTO product_tags (product_id, tag_id) VALUES (:pid, :tid) ON CONFLICT DO NOTHING
            """), {"pid": pid, "tid": TAG[t]})


def downgrade() -> None:
    conn = op.get_bind()
    for slug in [
        "ratnagiri-alphonso-mango", "devgad-alphonso-premium", "kesar-mango",
        "imported-cherries-class-1", "dragon-fruit-pink", "zespri-green-kiwi",
        "mahabaleshwar-strawberries", "blueberry-punnet", "nagpur-oranges",
        "fruit-gift-hamper", "hass-avocado", "pomegranate-bhagawa",
    ]:
        conn.execute(sa.text("DELETE FROM products WHERE slug = :s"), {"s": slug})
    for slug in ["organic", "imported", "gift-ready", "seasonal", "bestseller"]:
        conn.execute(sa.text("DELETE FROM tags WHERE slug = :s"), {"s": slug})
    for slug in ["mangoes", "exotic-fruits", "seasonal-picks", "citrus", "berries", "gift-hampers"]:
        conn.execute(sa.text("DELETE FROM categories WHERE slug = :s"), {"s": slug})
    for slug in ["orchard-fresh", "konkan-gold"]:
        conn.execute(sa.text("DELETE FROM brands WHERE slug = :s"), {"s": slug})
