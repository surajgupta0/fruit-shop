"""Industry-standard product fields: brands, options, attributes, commerce metadata

Revision ID: 005_catalog_full
Revises: 004_catalog
Create Date: 2026-08-23
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_catalog_full"
down_revision: Union[str, None] = "004_catalog"
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
        "brands",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_audit_cols(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_brands_slug", "brands", ["slug"])
    _audit_fks("brands")

    op.add_column("products", sa.Column("brand_id", sa.UUID(), nullable=True))
    op.add_column(
        "products",
        sa.Column("product_type", sa.String(length=32), nullable=False, server_default="simple"),
    )
    op.add_column(
        "products",
        sa.Column("visibility", sa.String(length=32), nullable=False, server_default="visible"),
    )
    op.add_column(
        "products",
        sa.Column("is_organic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "products",
        sa.Column("is_perishable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "products",
        sa.Column("is_taxable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "products",
        sa.Column(
            "requires_shipping", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "track_inventory", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )
    op.add_column("products", sa.Column("vendor", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("hsn_code", sa.String(length=16), nullable=True))
    op.add_column("products", sa.Column("tax_percent", sa.Numeric(5, 2), nullable=True))
    op.add_column("products", sa.Column("badge_label", sa.String(length=40), nullable=True))
    op.add_column(
        "products",
        sa.Column("min_order_qty", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("products", sa.Column("max_order_qty", sa.Integer(), nullable=True))
    op.add_column(
        "products",
        sa.Column("order_qty_increment", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("products", sa.Column("shelf_life_days", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("storage_instructions", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("origin_country", sa.String(length=2), nullable=True))
    op.add_column("products", sa.Column("origin_region", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("allergen_info", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("nutrition_info", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("search_keywords", sa.String(length=500), nullable=True))
    op.add_column(
        "products",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_products_brand_id", "products", ["brand_id"])
    op.create_index("ix_products_visibility", "products", ["visibility"])
    op.create_foreign_key(
        "fk_products_brand_id_brands",
        "products",
        "brands",
        ["brand_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "product_images",
        sa.Column("media_type", sa.String(length=32), nullable=False, server_default="image"),
    )

    op.add_column("product_variants", sa.Column("gtin", sa.String(length=14), nullable=True))
    op.add_column("product_variants", sa.Column("option1", sa.String(length=120), nullable=True))
    op.add_column("product_variants", sa.Column("option2", sa.String(length=120), nullable=True))
    op.add_column("product_variants", sa.Column("option3", sa.String(length=120), nullable=True))
    op.alter_column(
        "product_variants",
        "option_label",
        existing_type=sa.String(length=120),
        type_=sa.String(length=200),
        existing_nullable=True,
    )
    op.add_column("product_variants", sa.Column("length_cm", sa.Numeric(8, 2), nullable=True))
    op.add_column("product_variants", sa.Column("width_cm", sa.Numeric(8, 2), nullable=True))
    op.add_column("product_variants", sa.Column("height_cm", sa.Numeric(8, 2), nullable=True))
    op.add_column(
        "product_variants",
        sa.Column("low_stock_threshold", sa.Integer(), nullable=False, server_default="5"),
    )
    op.add_column(
        "product_variants",
        sa.Column(
            "inventory_policy", sa.String(length=32), nullable=False, server_default="deny"
        ),
    )

    op.create_table(
        "product_options",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "name", name="uq_product_option_name"),
    )
    op.create_index("ix_product_options_product_id", "product_options", ["product_id"])
    _audit_fks("product_options")

    op.create_table(
        "product_option_values",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("option_id", sa.UUID(), nullable=False),
        sa.Column("value", sa.String(length=120), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["option_id"], ["product_options.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("option_id", "value", name="uq_product_option_value"),
    )
    op.create_index("ix_product_option_values_option_id", "product_option_values", ["option_id"])
    _audit_fks("product_option_values")

    op.create_table(
        "product_attributes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("value", sa.String(length=500), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "name", name="uq_product_attribute_name"),
    )
    op.create_index("ix_product_attributes_product_id", "product_attributes", ["product_id"])
    _audit_fks("product_attributes")

    brands = sa.table(
        "brands",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
        sa.column("description", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        brands,
        [
            {
                "id": uuid.uuid4(),
                "name": "Fruit Shop Farms",
                "slug": "fruit-shop-farms",
                "description": "House brand — farm direct",
                "is_active": True,
            },
            {
                "id": uuid.uuid4(),
                "name": "Organic Valley",
                "slug": "organic-valley",
                "description": "Certified organic partner",
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    for table in ("product_attributes", "product_option_values", "product_options"):
        op.drop_constraint(f"fk_{table}_updated_by_users", table, type_="foreignkey")
        op.drop_constraint(f"fk_{table}_created_by_users", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_updated_by", table_name=table)
        op.drop_index(f"ix_{table}_created_by", table_name=table)

    op.drop_table("product_attributes")
    op.drop_table("product_option_values")
    op.drop_table("product_options")

    op.drop_column("product_variants", "inventory_policy")
    op.drop_column("product_variants", "low_stock_threshold")
    op.drop_column("product_variants", "height_cm")
    op.drop_column("product_variants", "width_cm")
    op.drop_column("product_variants", "length_cm")
    op.alter_column(
        "product_variants",
        "option_label",
        existing_type=sa.String(length=200),
        type_=sa.String(length=120),
        existing_nullable=True,
    )
    op.drop_column("product_variants", "option3")
    op.drop_column("product_variants", "option2")
    op.drop_column("product_variants", "option1")
    op.drop_column("product_variants", "gtin")
    op.drop_column("product_images", "media_type")

    op.drop_constraint("fk_products_brand_id_brands", "products", type_="foreignkey")
    op.drop_index("ix_products_visibility", table_name="products")
    op.drop_index("ix_products_brand_id", table_name="products")
    for col in (
        "sort_order",
        "search_keywords",
        "nutrition_info",
        "allergen_info",
        "origin_region",
        "origin_country",
        "storage_instructions",
        "shelf_life_days",
        "order_qty_increment",
        "max_order_qty",
        "min_order_qty",
        "badge_label",
        "tax_percent",
        "hsn_code",
        "vendor",
        "track_inventory",
        "requires_shipping",
        "is_taxable",
        "is_perishable",
        "is_organic",
        "visibility",
        "product_type",
        "brand_id",
    ):
        op.drop_column("products", col)

    op.drop_constraint("fk_brands_updated_by_users", "brands", type_="foreignkey")
    op.drop_constraint("fk_brands_created_by_users", "brands", type_="foreignkey")
    op.drop_index("ix_brands_updated_by", table_name="brands")
    op.drop_index("ix_brands_created_by", table_name="brands")
    op.drop_index("ix_brands_slug", table_name="brands")
    op.drop_table("brands")
