from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.cms.models import BlockType, PageStatus


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


def _slugify(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-")[:140]


# ---------- Banners ----------


class BannerCreate(BaseModel):
    placement: str = Field(default="home_hero", min_length=1, max_length=64)
    label: str | None = Field(default=None, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str = Field(min_length=1, max_length=500)
    image_alt: str | None = Field(default=None, max_length=255)
    primary_href: str | None = Field(default=None, max_length=500)
    primary_label: str | None = Field(default=None, max_length=80)
    secondary_href: str | None = Field(default=None, max_length=500)
    secondary_label: str | None = Field(default=None, max_length=80)
    sort_order: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class BannerUpdate(BaseModel):
    placement: str | None = Field(default=None, min_length=1, max_length=64)
    label: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = Field(default=None, min_length=1, max_length=500)
    image_alt: str | None = Field(default=None, max_length=255)
    primary_href: str | None = Field(default=None, max_length=500)
    primary_label: str | None = Field(default=None, max_length=80)
    secondary_href: str | None = Field(default=None, max_length=500)
    secondary_label: str | None = Field(default=None, max_length=80)
    sort_order: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class BannerResponse(AuditFields):
    id: UUID | str
    placement: str
    label: str | None = None
    title: str
    description: str | None = None
    image_url: str
    image_alt: str | None = None
    primary_href: str | None = None
    primary_label: str | None = None
    secondary_href: str | None = None
    secondary_label: str | None = None
    sort_order: int
    is_active: bool
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    model_config = {"from_attributes": True}


class BannerListResponse(BaseModel):
    items: list[BannerResponse]
    total: int
    page: int
    page_size: int


# ---------- Pages & blocks ----------


class ContentBlockCreate(BaseModel):
    block_type: BlockType = BlockType.rich_text
    sort_order: int = 0
    is_visible: bool = True
    heading: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    image_alt: str | None = Field(default=None, max_length=255)
    href: str | None = Field(default=None, max_length=500)
    href_label: str | None = Field(default=None, max_length=80)
    ref_id: UUID | None = None
    ref_key: str | None = Field(default=None, max_length=120)


class ContentBlockUpdate(BaseModel):
    block_type: BlockType | None = None
    sort_order: int | None = None
    is_visible: bool | None = None
    heading: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    image_alt: str | None = Field(default=None, max_length=255)
    href: str | None = Field(default=None, max_length=500)
    href_label: str | None = Field(default=None, max_length=80)
    ref_id: UUID | None = None
    ref_key: str | None = Field(default=None, max_length=120)


class ContentBlockResponse(AuditFields):
    id: UUID | str
    page_id: UUID | str
    block_type: BlockType | str
    sort_order: int
    is_visible: bool
    heading: str | None = None
    body: str | None = None
    image_url: str | None = None
    image_alt: str | None = None
    href: str | None = None
    href_label: str | None = None
    ref_id: UUID | str | None = None
    ref_key: str | None = None

    model_config = {"from_attributes": True}


class ContentBlockReorderItem(BaseModel):
    id: UUID
    sort_order: int = Field(ge=0)


class ContentBlockReorderRequest(BaseModel):
    blocks: list[ContentBlockReorderItem] = Field(min_length=1)


class PageCreate(BaseModel):
    slug: str | None = Field(default=None, max_length=140)
    title: str = Field(min_length=1, max_length=200)
    excerpt: str | None = Field(default=None, max_length=500)
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    status: PageStatus = PageStatus.draft
    published_at: datetime | None = None
    sort_order: int = 0
    blocks: list[ContentBlockCreate] = Field(default_factory=list)

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return _slugify(value)


class PageUpdate(BaseModel):
    slug: str | None = Field(default=None, max_length=140)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    excerpt: str | None = Field(default=None, max_length=500)
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    status: PageStatus | None = None
    published_at: datetime | None = None
    sort_order: int | None = None

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            raise ValueError("slug cannot be empty")
        return _slugify(value)


class PageSummaryResponse(AuditFields):
    id: UUID | str
    slug: str
    title: str
    excerpt: str | None = None
    status: PageStatus | str
    published_at: datetime | None = None
    sort_order: int
    block_count: int = 0

    model_config = {"from_attributes": True}


class PageDetailResponse(AuditFields):
    id: UUID | str
    slug: str
    title: str
    excerpt: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    status: PageStatus | str
    published_at: datetime | None = None
    sort_order: int
    blocks: list[ContentBlockResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PageListResponse(BaseModel):
    items: list[PageSummaryResponse]
    total: int
    page: int
    page_size: int


# ---------- Snippets ----------


class SnippetCreate(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    body: str | None = None
    href: str | None = Field(default=None, max_length=500)
    href_label: str | None = Field(default=None, max_length=80)
    is_active: bool = True

    @field_validator("key")
    @classmethod
    def normalize_key(cls, value: str) -> str:
        cleaned = value.strip().lower().replace(" ", "_")
        if not cleaned:
            raise ValueError("key is required")
        return cleaned[:80]


class SnippetUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = None
    href: str | None = Field(default=None, max_length=500)
    href_label: str | None = Field(default=None, max_length=80)
    is_active: bool | None = None


class SnippetResponse(AuditFields):
    id: UUID | str
    key: str
    title: str
    body: str | None = None
    href: str | None = None
    href_label: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class SnippetListResponse(BaseModel):
    items: list[SnippetResponse]
    total: int
    page: int
    page_size: int
