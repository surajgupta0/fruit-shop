"""CMS banners, pages, content blocks, snippets + cms:manage RBAC

Revision ID: 014_cms
Revises: 013_product_reviews
Create Date: 2026-09-15
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "014_cms"
down_revision: Union[str, None] = "013_product_reviews"
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
        "cms_banners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("placement", sa.String(length=64), nullable=False, server_default="home_hero"),
        sa.Column("label", sa.String(length=80), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("image_alt", sa.String(length=255), nullable=True),
        sa.Column("primary_href", sa.String(length=500), nullable=True),
        sa.Column("primary_label", sa.String(length=80), nullable=True),
        sa.Column("secondary_href", sa.String(length=500), nullable=True),
        sa.Column("secondary_label", sa.String(length=80), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_cols(),
    )
    op.create_index("ix_cms_banners_placement", "cms_banners", ["placement"])
    op.create_index("ix_cms_banners_is_active", "cms_banners", ["is_active"])

    op.create_table(
        "cms_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("excerpt", sa.String(length=500), nullable=True),
        sa.Column("meta_title", sa.String(length=200), nullable=True),
        sa.Column("meta_description", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        *_audit_cols(),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_cms_pages_slug", "cms_pages", ["slug"])
    op.create_index("ix_cms_pages_status", "cms_pages", ["status"])

    op.create_table(
        "cms_content_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("block_type", sa.String(length=32), nullable=False, server_default="rich_text"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("heading", sa.String(length=200), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("image_alt", sa.String(length=255), nullable=True),
        sa.Column("href", sa.String(length=500), nullable=True),
        sa.Column("href_label", sa.String(length=80), nullable=True),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ref_key", sa.String(length=120), nullable=True),
        *_audit_cols(),
        sa.ForeignKeyConstraint(["page_id"], ["cms_pages.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_cms_content_blocks_page_id", "cms_content_blocks", ["page_id"])
    op.create_index(
        "ix_cms_content_blocks_page_sort",
        "cms_content_blocks",
        ["page_id", "sort_order"],
    )

    op.create_table(
        "cms_snippets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("href", sa.String(length=500), nullable=True),
        sa.Column("href_label", sa.String(length=80), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_audit_cols(),
        sa.UniqueConstraint("key", name="uq_cms_snippet_key"),
    )
    op.create_index("ix_cms_snippets_key", "cms_snippets", ["key"])

    conn = op.get_bind()
    perms = [("cms:manage", "Manage CMS banners, pages, and content")]
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
    op.drop_index("ix_cms_snippets_key", table_name="cms_snippets")
    op.drop_table("cms_snippets")
    op.drop_index("ix_cms_content_blocks_page_sort", table_name="cms_content_blocks")
    op.drop_index("ix_cms_content_blocks_page_id", table_name="cms_content_blocks")
    op.drop_table("cms_content_blocks")
    op.drop_index("ix_cms_pages_status", table_name="cms_pages")
    op.drop_index("ix_cms_pages_slug", table_name="cms_pages")
    op.drop_table("cms_pages")
    op.drop_index("ix_cms_banners_is_active", table_name="cms_banners")
    op.drop_index("ix_cms_banners_placement", table_name="cms_banners")
    op.drop_table("cms_banners")
