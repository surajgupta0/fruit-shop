from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.mixins import AuditMixin


class PageStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class BlockType(str, enum.Enum):
    rich_text = "rich_text"
    image = "image"
    cta = "cta"
    html = "html"
    product_rail = "product_rail"
    banner_ref = "banner_ref"


class CmsBanner(AuditMixin, Base):
    """Storefront banners (hero slides, promo strips, etc.)."""

    __tablename__ = "cms_banners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    placement: Mapped[str] = mapped_column(String(64), index=True, default="home_hero")
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str] = mapped_column(String(500))
    image_alt: Mapped[str | None] = mapped_column(String(255), nullable=True)

    primary_href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    secondary_href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    secondary_label: Mapped[str | None] = mapped_column(String(80), nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CmsPage(AuditMixin, Base):
    """CMS pages (about, shipping, FAQ landing, etc.)."""

    __tablename__ = "cms_pages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    excerpt: Mapped[str | None] = mapped_column(String(500), nullable=True)
    meta_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PageStatus] = mapped_column(
        Enum(PageStatus, name="cms_page_status", native_enum=False),
        default=PageStatus.draft,
        index=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    blocks: Mapped[list[CmsContentBlock]] = relationship(
        back_populates="page",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CmsContentBlock.sort_order",
    )


class CmsContentBlock(AuditMixin, Base):
    """Ordered content blocks belonging to a CMS page."""

    __tablename__ = "cms_content_blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cms_pages.id", ondelete="CASCADE"),
        index=True,
    )
    block_type: Mapped[BlockType] = mapped_column(
        Enum(BlockType, name="cms_block_type", native_enum=False),
        default=BlockType.rich_text,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    heading: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_alt: Mapped[str | None] = mapped_column(String(255), nullable=True)
    href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    href_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ref_key: Mapped[str | None] = mapped_column(String(120), nullable=True)

    page: Mapped[CmsPage] = relationship(back_populates="blocks")


class CmsSnippet(AuditMixin, Base):
    """Named reusable content (announcement bar, footer blurb, etc.)."""

    __tablename__ = "cms_snippets"
    __table_args__ = (UniqueConstraint("key", name="uq_cms_snippet_key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    href_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
