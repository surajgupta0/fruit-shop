"""Cart, orders, order items, payments

Revision ID: 007_cart_orders
Revises: 006_seed_catalog
Create Date: 2026-08-30
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_cart_orders"
down_revision: Union[str, None] = "006_seed_catalog"
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
        "carts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_carts_user_id", "carts", ["user_id"])
    _audit_fks("carts")

    op.create_table(
        "cart_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cart_id", sa.UUID(), nullable=False),
        sa.Column("variant_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["cart_id"], ["carts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cart_id", "variant_id", name="uq_cart_item_variant"),
    )
    op.create_index("ix_cart_items_cart_id", "cart_items", ["cart_id"])
    op.create_index("ix_cart_items_variant_id", "cart_items", ["variant_id"])
    _audit_fks("cart_items")

    op.create_table(
        "orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_number", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("payment_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("payment_method", sa.String(length=32), nullable=False, server_default="cod"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("shipping_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("shipping_label", sa.String(length=64), nullable=False, server_default="home"),
        sa.Column("shipping_line1", sa.String(length=255), nullable=False),
        sa.Column("shipping_line2", sa.String(length=255), nullable=True),
        sa.Column("shipping_city", sa.String(length=100), nullable=False),
        sa.Column("shipping_state", sa.String(length=100), nullable=False),
        sa.Column("shipping_postal_code", sa.String(length=20), nullable=False),
        sa.Column("shipping_country", sa.String(length=2), nullable=False, server_default="IN"),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_phone", sa.String(length=32), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_reason", sa.String(length=500), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_number"),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_payment_status", "orders", ["payment_status"])
    _audit_fks("orders")

    op.create_table(
        "order_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=True),
        sa.Column("variant_id", sa.UUID(), nullable=True),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("variant_name", sa.String(length=120), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("unit_label", sa.String(length=40), nullable=True),
        sa.Column("primary_image_url", sa.String(length=500), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("line_subtotal", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("tax_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(precision=12, scale=2), nullable=False),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
    op.create_index("ix_order_items_variant_id", "order_items", ["variant_id"])
    _audit_fks("order_items")

    op.create_table(
        "payments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("method", sa.String(length=32), nullable=False, server_default="cod"),
        sa.Column("provider", sa.String(length=64), nullable=True),
        sa.Column("provider_reference", sa.String(length=255), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id"),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    _audit_fks("payments")


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("cart_items")
    op.drop_table("carts")
