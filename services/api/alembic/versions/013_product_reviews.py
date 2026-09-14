"""product reviews + reviews:manage RBAC

Revision ID: 013_product_reviews
Revises: 012_orders_fulfillment
Create Date: 2026-09-15
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "013_product_reviews"
down_revision: Union[str, None] = "012_orders_fulfillment"
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
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "product_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column(
            "is_verified_purchase",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("admin_note", sa.String(length=500), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_product_reviews_rating"),
        sa.UniqueConstraint("user_id", "product_id", name="uq_review_user_product"),
    )
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])
    op.create_index("ix_product_reviews_user_id", "product_reviews", ["user_id"])
    op.create_index("ix_product_reviews_order_id", "product_reviews", ["order_id"])
    op.create_index("ix_product_reviews_status", "product_reviews", ["status"])
    op.create_index(
        "ix_product_reviews_product_status",
        "product_reviews",
        ["product_id", "status"],
    )

    conn = op.get_bind()
    perms = [
        ("reviews:manage", "Moderate product reviews"),
    ]
    for code, description in perms:
        pid = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO permissions (id, code, description, created_at, updated_at) "
                "SELECT CAST(:id AS uuid), CAST(:code AS varchar), CAST(:description AS varchar), "
                "now(), now() "
                "WHERE NOT EXISTS ("
                "  SELECT 1 FROM permissions WHERE code = CAST(:code AS varchar)"
                ")"
            ),
            {"id": str(pid), "code": code, "description": description},
        )

    for role_name in ("admin", "staff"):
        for code, _ in perms:
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) "
                    "SELECT CAST(:id AS uuid), r.id, p.id, now(), now() "
                    "FROM roles r, permissions p "
                    "WHERE r.name = CAST(:role AS varchar) AND p.code = CAST(:code AS varchar) "
                    "AND NOT EXISTS ("
                    "  SELECT 1 FROM role_permissions rp "
                    "  WHERE rp.role_id = r.id AND rp.permission_id = p.id"
                    ")"
                ),
                {"id": str(uuid.uuid4()), "role": role_name, "code": code},
            )


def downgrade() -> None:
    op.drop_index("ix_product_reviews_product_status", table_name="product_reviews")
    op.drop_index("ix_product_reviews_status", table_name="product_reviews")
    op.drop_index("ix_product_reviews_order_id", table_name="product_reviews")
    op.drop_index("ix_product_reviews_user_id", table_name="product_reviews")
    op.drop_index("ix_product_reviews_product_id", table_name="product_reviews")
    op.drop_table("product_reviews")
