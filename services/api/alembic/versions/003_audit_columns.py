"""Add audit columns (created_at, updated_at, created_by, updated_by) to all tables

Revision ID: 003_audit_columns
Revises: 002_rbac_users
Create Date: 2026-08-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_audit_columns"
down_revision: Union[str, None] = "002_rbac_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "users",
    "otp_codes",
    "refresh_tokens",
    "roles",
    "permissions",
    "role_permissions",
    "user_addresses",
)

# Tables that already have created_at from earlier migrations
HAS_CREATED_AT = {"users", "roles", "permissions", "user_addresses"}
# Tables that already have updated_at
HAS_UPDATED_AT = {"users"}


def _add_audit(table: str) -> None:
    if table not in HAS_CREATED_AT:
        op.add_column(
            table,
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
    if table not in HAS_UPDATED_AT:
        op.add_column(
            table,
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )

    op.add_column(table, sa.Column("created_by", sa.UUID(), nullable=True))
    op.add_column(table, sa.Column("updated_by", sa.UUID(), nullable=True))
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


def _drop_audit(table: str) -> None:
    op.drop_constraint(f"fk_{table}_updated_by_users", table, type_="foreignkey")
    op.drop_constraint(f"fk_{table}_created_by_users", table, type_="foreignkey")
    op.drop_index(f"ix_{table}_updated_by", table_name=table)
    op.drop_index(f"ix_{table}_created_by", table_name=table)
    op.drop_column(table, "updated_by")
    op.drop_column(table, "created_by")
    if table not in HAS_UPDATED_AT:
        op.drop_column(table, "updated_at")
    if table not in HAS_CREATED_AT:
        op.drop_column(table, "created_at")


def upgrade() -> None:
    for table in TABLES:
        _add_audit(table)


def downgrade() -> None:
    for table in reversed(TABLES):
        _drop_audit(table)
