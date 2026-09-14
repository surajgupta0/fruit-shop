"""coupons, order coupon fields, notification logs, RBAC

Revision ID: 010_coupons_notifications
Revises: 009_password_reset
Create Date: 2026-09-14
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010_coupons_notifications"
down_revision: Union[str, None] = "009_password_reset"
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
        "coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discount_type", sa.String(length=32), nullable=False),
        sa.Column("percent_off", sa.Numeric(5, 2), nullable=True),
        sa.Column("amount_off", sa.Numeric(12, 2), nullable=True),
        sa.Column("max_discount", sa.Numeric(12, 2), nullable=True),
        sa.Column("min_subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("usage_limit", sa.Integer(), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("per_user_limit", sa.Integer(), nullable=True),
        sa.Column(
            "first_order_only", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        *_audit_cols(),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"])

    op.add_column(
        "orders",
        sa.Column("coupon_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("orders", sa.Column("coupon_code", sa.String(length=40), nullable=True))
    op.create_index("ix_orders_coupon_id", "orders", ["coupon_id"])
    op.create_foreign_key(
        "fk_orders_coupon_id_coupons",
        "orders",
        "coupons",
        ["coupon_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "coupon_redemptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("coupon_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("code_snapshot", sa.String(length=40), nullable=False),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("order_id", name="uq_coupon_redemption_order"),
    )
    op.create_index("ix_coupon_redemptions_coupon_id", "coupon_redemptions", ["coupon_id"])
    op.create_index("ix_coupon_redemptions_user_id", "coupon_redemptions", ["user_id"])
    op.create_index("ix_coupon_redemptions_order_id", "coupon_redemptions", ["order_id"])

    op.create_table(
        "notification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event", sa.String(length=64), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("recipient", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.UniqueConstraint(
            "order_id", "event", "channel", name="uq_notification_order_event_channel"
        ),
    )
    op.create_index("ix_notification_logs_user_id", "notification_logs", ["user_id"])
    op.create_index("ix_notification_logs_order_id", "notification_logs", ["order_id"])
    op.create_index("ix_notification_logs_event", "notification_logs", ["event"])
    op.create_index("ix_notification_logs_channel", "notification_logs", ["channel"])

    # RBAC seed
    conn = op.get_bind()
    perms = [
        ("coupons:manage", "Manage coupons"),
        ("notifications:read", "Read notification logs"),
    ]
    for code, description in perms:
        pid = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO permissions (id, code, description, created_at, updated_at) "
                "SELECT CAST(:id AS uuid), :code, :description, now(), now() "
                "WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = :code)"
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
                    "WHERE r.name = :role AND p.code = :code "
                    "AND NOT EXISTS ("
                    "  SELECT 1 FROM role_permissions rp "
                    "  WHERE rp.role_id = r.id AND rp.permission_id = p.id"
                    ")"
                ),
                {"id": str(uuid.uuid4()), "role": role_name, "code": code},
            )


def downgrade() -> None:
    op.drop_table("notification_logs")
    op.drop_table("coupon_redemptions")
    op.drop_constraint("fk_orders_coupon_id_coupons", "orders", type_="foreignkey")
    op.drop_index("ix_orders_coupon_id", table_name="orders")
    op.drop_column("orders", "coupon_code")
    op.drop_column("orders", "coupon_id")
    op.drop_table("coupons")
