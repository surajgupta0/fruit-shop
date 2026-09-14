"""order fulfillment fields, status events, checkout idempotency

Revision ID: 012_orders_fulfillment
Revises: 011_inventory
Create Date: 2026-09-14
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "012_orders_fulfillment"
down_revision: Union[str, None] = "011_inventory"
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
    op.add_column("orders", sa.Column("tracking_number", sa.String(length=120), nullable=True))
    op.add_column("orders", sa.Column("carrier", sa.String(length=80), nullable=True))
    op.add_column(
        "orders",
        sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("orders", sa.Column("internal_notes", sa.Text(), nullable=True))
    op.add_column(
        "orders",
        sa.Column("idempotency_key", sa.String(length=120), nullable=True),
    )
    op.create_index("ix_orders_idempotency_key", "orders", ["idempotency_key"], unique=True)

    op.create_table(
        "order_status_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", sa.String(length=32), nullable=True),
        sa.Column("to_status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_order_status_events_order_id", "order_status_events", ["order_id"])


def downgrade() -> None:
    op.drop_table("order_status_events")
    op.drop_index("ix_orders_idempotency_key", table_name="orders")
    op.drop_column("orders", "idempotency_key")
    op.drop_column("orders", "internal_notes")
    op.drop_column("orders", "delivered_at")
    op.drop_column("orders", "shipped_at")
    op.drop_column("orders", "carrier")
    op.drop_column("orders", "tracking_number")
