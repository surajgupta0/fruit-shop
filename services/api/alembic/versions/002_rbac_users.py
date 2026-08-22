"""RBAC tables + user addresses + seed roles/permissions

Revision ID: 002_rbac_users
Revises: 001_initial
Create Date: 2026-08-23
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_rbac_users"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLES = [
    ("customer", "Storefront customer (OTP login)"),
    ("staff", "Shop staff (email/password login)"),
    ("admin", "Full system administrator"),
]

PERMISSIONS = [
    ("users:read_self", "View own profile"),
    ("users:update_self", "Update own profile"),
    ("users:list", "List users"),
    ("users:read", "View any user"),
    ("users:create", "Create staff/admin users"),
    ("users:update", "Update any user"),
    ("users:change_role", "Change user roles"),
    ("users:deactivate", "Activate/deactivate users"),
    ("roles:list", "List roles and permissions"),
    ("roles:manage", "Manage role permissions"),
    ("catalog:manage", "Manage catalog"),
    ("inventory:manage", "Manage inventory"),
    ("orders:manage", "Manage orders"),
    ("orders:read", "Read orders"),
]

ROLE_PERMS = {
    "customer": ["users:read_self", "users:update_self", "orders:read"],
    "staff": [
        "users:read_self",
        "users:update_self",
        "users:list",
        "users:read",
        "catalog:manage",
        "inventory:manage",
        "orders:manage",
        "orders:read",
    ],
    "admin": [code for code, _ in PERMISSIONS],
}


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_roles_name", "roles", ["name"])

    op.create_table(
        "permissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_permissions_code", "permissions", ["code"])

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("role_id", sa.UUID(), nullable=False),
        sa.Column("permission_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )
    op.create_index("ix_role_permissions_role_id", "role_permissions", ["role_id"])
    op.create_index("ix_role_permissions_permission_id", "role_permissions", ["permission_id"])

    op.create_table(
        "user_addresses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("line1", sa.String(length=255), nullable=False),
        sa.Column("line2", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("postal_code", sa.String(length=20), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_addresses_user_id", "user_addresses", ["user_id"])

    op.add_column(
        "users",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_role", "users", ["role"])

    # Seed roles / permissions
    roles_t = sa.table(
        "roles",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("is_system", sa.Boolean),
    )
    perms_t = sa.table(
        "permissions",
        sa.column("id", sa.UUID),
        sa.column("code", sa.String),
        sa.column("description", sa.String),
    )
    rp_t = sa.table(
        "role_permissions",
        sa.column("id", sa.UUID),
        sa.column("role_id", sa.UUID),
        sa.column("permission_id", sa.UUID),
    )

    role_ids: dict[str, uuid.UUID] = {}
    for name, desc in ROLES:
        rid = uuid.uuid4()
        role_ids[name] = rid
        op.bulk_insert(roles_t, [{"id": rid, "name": name, "description": desc, "is_system": True}])

    perm_ids: dict[str, uuid.UUID] = {}
    for code, desc in PERMISSIONS:
        pid = uuid.uuid4()
        perm_ids[code] = pid
        op.bulk_insert(perms_t, [{"id": pid, "code": code, "description": desc}])

    rp_rows = []
    for role_name, codes in ROLE_PERMS.items():
        for code in codes:
            rp_rows.append(
                {
                    "id": uuid.uuid4(),
                    "role_id": role_ids[role_name],
                    "permission_id": perm_ids[code],
                }
            )
    if rp_rows:
        op.bulk_insert(rp_t, rp_rows)

    # Bootstrap local admin (password: Admin@12345)
    # bcrypt hash generated for "Admin@12345"
    import bcrypt

    admin_hash = bcrypt.hashpw(b"Admin@12345", bcrypt.gensalt()).decode()
    users_t = sa.table(
        "users",
        sa.column("id", sa.UUID),
        sa.column("phone", sa.String),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("name", sa.String),
        sa.column("role", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        users_t,
        [
            {
                "id": uuid.uuid4(),
                "phone": "+910000000001",
                "email": "admin@fruitshop.example",
                "password_hash": admin_hash,
                "name": "System Admin",
                "role": "admin",
                "is_active": True,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "updated_at")
    op.drop_index("ix_user_addresses_user_id", table_name="user_addresses")
    op.drop_table("user_addresses")
    op.drop_index("ix_role_permissions_permission_id", table_name="role_permissions")
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_table("role_permissions")
    op.drop_index("ix_permissions_code", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_table("roles")
