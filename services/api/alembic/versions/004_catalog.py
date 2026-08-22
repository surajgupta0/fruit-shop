"""Catalog: categories, tags, products, images, variants, relations

Revision ID: 004_catalog
Revises: 003_audit_columns
Create Date: 2026-08-23
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_catalog"
down_revision: Union[str, None] = "003_audit_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _audit_cols() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
    ]


def _audit_fks(table: str) -> None:
    op.create_index(f"ix_{table}_created_by", table, ["created_by"])
    op.create_index(f"ix_{table}_updated_by", table, ["updated_by"])
    op.create_foreign_key(
        f"fk_{table}_created_by_users",
        table,
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        f"fk_{table}_updated_by_users",
        table,
        "users",
        ["updated_by"],
        ["id"],
        ondelete="SET NULL",
    )


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])
    op.create_index("ix_categories_slug", "categories", ["slug"])
    _audit_fks("categories")

    op.create_table(
        "tags",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        *_audit_cols(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_tags_slug", "tags", ["slug"])
    _audit_fks("tags")

    op.create_table(
        "products",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("short_description", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("unit_label", sa.String(length=40), nullable=True),
        sa.Column("meta_title", sa.String(length=200), nullable=True),
        sa.Column("meta_description", sa.String(length=500), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_slug", "products", ["slug"])
    op.create_index("ix_products_status", "products", ["status"])
    _audit_fks("products")

    op.create_table(
        "product_tags",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("tag_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("product_id", "tag_id"),
        sa.UniqueConstraint("product_id", "tag_id", name="uq_product_tag"),
    )

    op.create_table(
        "product_images",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("alt_text", sa.String(length=255), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"])
    _audit_fks("product_images")

    op.create_table(
        "product_variants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("barcode", sa.String(length=64), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("compare_at_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("cost_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("weight_grams", sa.Integer(), nullable=True),
        sa.Column("option_label", sa.String(length=120), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stock_qty", sa.Integer(), nullable=False, server_default="0"),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku", name="uq_product_variant_sku"),
    )
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])
    op.create_index("ix_product_variants_sku", "product_variants", ["sku"])
    _audit_fks("product_variants")

    op.create_table(
        "product_relations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("related_product_id", sa.UUID(), nullable=False),
        sa.Column("relation_type", sa.String(length=32), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "product_id",
            "related_product_id",
            "relation_type",
            name="uq_product_relation",
        ),
    )
    op.create_index("ix_product_relations_product_id", "product_relations", ["product_id"])
    op.create_index(
        "ix_product_relations_related_product_id", "product_relations", ["related_product_id"]
    )
    _audit_fks("product_relations")

    categories = sa.table(
        "categories",
        sa.column("id", sa.UUID),
        sa.column("parent_id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
        sa.column("description", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    fresh_id = uuid.uuid4()
    citrus_id = uuid.uuid4()
    tropical_id = uuid.uuid4()
    organic_id = uuid.uuid4()
    op.bulk_insert(
        categories,
        [
            {
                "id": fresh_id,
                "parent_id": None,
                "name": "Fresh Fruits",
                "slug": "fresh-fruits",
                "description": "Daily farm-fresh fruits",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "id": citrus_id,
                "parent_id": fresh_id,
                "name": "Citrus",
                "slug": "citrus",
                "description": "Oranges, lemons, and more",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "id": tropical_id,
                "parent_id": fresh_id,
                "name": "Tropical",
                "slug": "tropical",
                "description": "Mango, pineapple, banana",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "id": organic_id,
                "parent_id": None,
                "name": "Organic",
                "slug": "organic",
                "description": "Certified organic produce",
                "sort_order": 2,
                "is_active": True,
            },
        ],
    )

    tags = sa.table(
        "tags",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
    )
    op.bulk_insert(
        tags,
        [
            {"id": uuid.uuid4(), "name": "Seasonal", "slug": "seasonal"},
            {"id": uuid.uuid4(), "name": "Bestseller", "slug": "bestseller"},
            {"id": uuid.uuid4(), "name": "Organic", "slug": "organic"},
            {"id": uuid.uuid4(), "name": "Imported", "slug": "imported"},
            {"id": uuid.uuid4(), "name": "Local Farm", "slug": "local-farm"},
        ],
    )


def downgrade() -> None:
    for table in (
        "product_relations",
        "product_variants",
        "product_images",
        "products",
        "tags",
        "categories",
    ):
        op.drop_constraint(f"fk_{table}_updated_by_users", table, type_="foreignkey")
        op.drop_constraint(f"fk_{table}_created_by_users", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_updated_by", table_name=table)
        op.drop_index(f"ix_{table}_created_by", table_name=table)

    op.drop_table("product_relations")
    op.drop_table("product_variants")
    op.drop_table("product_images")
    op.drop_table("product_tags")
    op.drop_table("products")
    op.drop_table("tags")
    op.drop_table("categories")
