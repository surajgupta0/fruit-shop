from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.catalog.models import (
    InventoryPolicy,
    MediaType,
    ProductStatus,
    ProductType,
    ProductVisibility,
    RelationType,
)


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:220] or "item"


# ---------- brands ----------

class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = None
    logo_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = None
    logo_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class BrandResponse(AuditFields):
    id: UUID | str
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


# ---------- categories ----------

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    parent_id: UUID | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    parent_id: UUID | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryResponse(AuditFields):
    id: UUID | str
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    parent_id: UUID | str | None = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class CategoryTreeResponse(CategoryResponse):
    children: list[CategoryTreeResponse] = Field(default_factory=list)


# ---------- tags ----------

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=100)


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=100)


class TagResponse(AuditFields):
    id: UUID | str
    name: str
    slug: str

    model_config = {"from_attributes": True}


# ---------- nested product parts ----------

class ProductOptionValueCreate(BaseModel):
    value: str = Field(min_length=1, max_length=120)
    sort_order: int = 0


class ProductOptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    position: int = Field(default=1, ge=1, le=3)
    values: list[ProductOptionValueCreate] = Field(default_factory=list)


class ProductOptionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    position: int | None = Field(default=None, ge=1, le=3)


class ProductOptionValueUpdate(BaseModel):
    value: str | None = Field(default=None, min_length=1, max_length=120)
    sort_order: int | None = None


class ProductOptionValueResponse(AuditFields):
    id: UUID | str
    value: str
    sort_order: int

    model_config = {"from_attributes": True}


class ProductOptionResponse(AuditFields):
    id: UUID | str
    name: str
    position: int
    values: list[ProductOptionValueResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ProductAttributeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=500)
    sort_order: int = 0
    is_visible: bool = True


class ProductAttributeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    value: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    is_visible: bool | None = None


class ProductAttributeResponse(AuditFields):
    id: UUID | str
    name: str
    value: str
    sort_order: int
    is_visible: bool

    model_config = {"from_attributes": True}


class ProductImageCreate(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    media_type: MediaType = MediaType.image
    sort_order: int = 0
    is_primary: bool = False


class ProductImageUpdate(BaseModel):
    url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    media_type: MediaType | None = None
    sort_order: int | None = None
    is_primary: bool | None = None


class ProductImageResponse(AuditFields):
    id: UUID | str
    url: str
    alt_text: str | None = None
    media_type: str
    sort_order: int
    is_primary: bool

    model_config = {"from_attributes": True}


class ProductVariantCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    barcode: str | None = Field(default=None, max_length=64)
    gtin: str | None = Field(default=None, max_length=14)
    price: Decimal = Field(ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    option1: str | None = Field(default=None, max_length=120)
    option2: str | None = Field(default=None, max_length=120)
    option3: str | None = Field(default=None, max_length=120)
    option_label: str | None = Field(default=None, max_length=200)
    weight_grams: int | None = Field(default=None, ge=0)
    length_cm: Decimal | None = Field(default=None, ge=0)
    width_cm: Decimal | None = Field(default=None, ge=0)
    height_cm: Decimal | None = Field(default=None, ge=0)
    is_default: bool = False
    is_active: bool = True
    sort_order: int = 0
    stock_qty: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    inventory_policy: InventoryPolicy = InventoryPolicy.deny


class ProductVariantUpdate(BaseModel):
    sku: str | None = Field(default=None, max_length=64)
    name: str | None = Field(default=None, max_length=120)
    barcode: str | None = Field(default=None, max_length=64)
    gtin: str | None = Field(default=None, max_length=14)
    price: Decimal | None = Field(default=None, ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    option1: str | None = Field(default=None, max_length=120)
    option2: str | None = Field(default=None, max_length=120)
    option3: str | None = Field(default=None, max_length=120)
    option_label: str | None = Field(default=None, max_length=200)
    weight_grams: int | None = Field(default=None, ge=0)
    length_cm: Decimal | None = Field(default=None, ge=0)
    width_cm: Decimal | None = Field(default=None, ge=0)
    height_cm: Decimal | None = Field(default=None, ge=0)
    is_default: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    stock_qty: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    inventory_policy: InventoryPolicy | None = None


class ProductVariantResponse(AuditFields):
    id: UUID | str
    sku: str
    name: str
    barcode: str | None = None
    gtin: str | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    option1: str | None = None
    option2: str | None = None
    option3: str | None = None
    option_label: str | None = None
    weight_grams: int | None = None
    length_cm: Decimal | None = None
    width_cm: Decimal | None = None
    height_cm: Decimal | None = None
    is_default: bool
    is_active: bool
    sort_order: int
    stock_qty: int
    reserved_qty: int = 0
    available_qty: int = 0
    low_stock_threshold: int
    inventory_policy: str

    model_config = {"from_attributes": True}


class ProductRelationCreate(BaseModel):
    related_product_id: UUID
    relation_type: RelationType = RelationType.related
    sort_order: int = 0


class ProductRelationResponse(AuditFields):
    id: UUID | str
    related_product_id: UUID | str
    relation_type: str
    sort_order: int
    related_name: str | None = None
    related_slug: str | None = None

    model_config = {"from_attributes": True}


# ---------- products ----------

class ProductCreate(BaseModel):
    """Full industry-style product create payload (everything nested)."""

    name: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None

    category_id: UUID | None = None
    brand_id: UUID | None = None
    product_type: ProductType = ProductType.simple
    status: ProductStatus = ProductStatus.draft
    visibility: ProductVisibility = ProductVisibility.visible

    is_featured: bool = False
    is_organic: bool = False
    is_perishable: bool = True
    is_taxable: bool = True
    requires_shipping: bool = True
    track_inventory: bool = True

    vendor: str | None = Field(default=None, max_length=120)
    unit_label: str | None = Field(default=None, max_length=40)
    hsn_code: str | None = Field(default=None, max_length=16)
    tax_percent: Decimal | None = Field(default=None, ge=0, le=100)
    badge_label: str | None = Field(default=None, max_length=40)

    min_order_qty: int = Field(default=1, ge=1)
    max_order_qty: int | None = Field(default=None, ge=1)
    order_qty_increment: int = Field(default=1, ge=1)

    shelf_life_days: int | None = Field(default=None, ge=0)
    storage_instructions: str | None = None
    origin_country: str | None = Field(default=None, min_length=2, max_length=2)
    origin_region: str | None = Field(default=None, max_length=120)
    allergen_info: str | None = None
    nutrition_info: str | None = None
    search_keywords: str | None = Field(default=None, max_length=500)

    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    sort_order: int = 0

    tag_ids: list[UUID] = Field(default_factory=list)
    options: list[ProductOptionCreate] = Field(default_factory=list)
    attributes: list[ProductAttributeCreate] = Field(default_factory=list)
    images: list[ProductImageCreate] = Field(default_factory=list)
    variants: list[ProductVariantCreate] = Field(default_factory=list)
    relations: list[ProductRelationCreate] = Field(default_factory=list)

    @field_validator("variants")
    @classmethod
    def at_most_one_default(cls, variants: list[ProductVariantCreate]) -> list[ProductVariantCreate]:
        if len([v for v in variants if v.is_default]) > 1:
            raise ValueError("Only one variant can be default")
        return variants

    @field_validator("options")
    @classmethod
    def max_three_options(cls, options: list[ProductOptionCreate]) -> list[ProductOptionCreate]:
        if len(options) > 3:
            raise ValueError("Maximum 3 product options (industry standard)")
        return options

    @model_validator(mode="after")
    def active_requires_variant(self) -> ProductCreate:
        if self.status == ProductStatus.active and not self.variants:
            raise ValueError("Active products require at least one variant")
        if self.max_order_qty is not None and self.max_order_qty < self.min_order_qty:
            raise ValueError("max_order_qty must be >= min_order_qty")
        return self


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    category_id: UUID | None = None
    brand_id: UUID | None = None
    product_type: ProductType | None = None
    status: ProductStatus | None = None
    visibility: ProductVisibility | None = None
    is_featured: bool | None = None
    is_organic: bool | None = None
    is_perishable: bool | None = None
    is_taxable: bool | None = None
    requires_shipping: bool | None = None
    track_inventory: bool | None = None
    vendor: str | None = Field(default=None, max_length=120)
    unit_label: str | None = Field(default=None, max_length=40)
    hsn_code: str | None = Field(default=None, max_length=16)
    tax_percent: Decimal | None = Field(default=None, ge=0, le=100)
    badge_label: str | None = Field(default=None, max_length=40)
    min_order_qty: int | None = Field(default=None, ge=1)
    max_order_qty: int | None = Field(default=None, ge=1)
    order_qty_increment: int | None = Field(default=None, ge=1)
    shelf_life_days: int | None = Field(default=None, ge=0)
    storage_instructions: str | None = None
    origin_country: str | None = Field(default=None, min_length=2, max_length=2)
    origin_region: str | None = Field(default=None, max_length=120)
    allergen_info: str | None = None
    nutrition_info: str | None = None
    search_keywords: str | None = Field(default=None, max_length=500)
    meta_title: str | None = Field(default=None, max_length=200)
    meta_description: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    tag_ids: list[UUID] | None = None


class ProductSummaryResponse(AuditFields):
    id: UUID | str
    name: str
    slug: str
    short_description: str | None = None
    status: str
    visibility: str
    product_type: str
    is_featured: bool
    is_organic: bool
    badge_label: str | None = None
    unit_label: str | None = None
    category_id: UUID | str | None = None
    category_name: str | None = None
    brand_id: UUID | str | None = None
    brand_name: str | None = None
    primary_image_url: str | None = None
    min_price: Decimal | None = None
    max_price: Decimal | None = None
    in_stock: bool = False
    total_stock: int = 0
    average_rating: Decimal = Decimal("0.00")
    review_count: int = 0
    tag_slugs: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ProductDetailResponse(AuditFields):
    id: UUID | str
    name: str
    slug: str
    short_description: str | None = None
    description: str | None = None
    product_type: str
    status: str
    visibility: str
    is_featured: bool
    is_organic: bool
    is_perishable: bool
    is_taxable: bool
    requires_shipping: bool
    track_inventory: bool
    vendor: str | None = None
    unit_label: str | None = None
    hsn_code: str | None = None
    tax_percent: Decimal | None = None
    badge_label: str | None = None
    min_order_qty: int
    max_order_qty: int | None = None
    order_qty_increment: int
    shelf_life_days: int | None = None
    storage_instructions: str | None = None
    origin_country: str | None = None
    origin_region: str | None = None
    allergen_info: str | None = None
    nutrition_info: str | None = None
    search_keywords: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    published_at: datetime | None = None
    sort_order: int
    category_id: UUID | str | None = None
    brand_id: UUID | str | None = None
    category: CategoryResponse | None = None
    brand: BrandResponse | None = None
    tags: list[TagResponse] = Field(default_factory=list)
    options: list[ProductOptionResponse] = Field(default_factory=list)
    attributes: list[ProductAttributeResponse] = Field(default_factory=list)
    images: list[ProductImageResponse] = Field(default_factory=list)
    variants: list[ProductVariantResponse] = Field(default_factory=list)
    relations: list[ProductRelationResponse] = Field(default_factory=list)
    average_rating: Decimal = Decimal("0.00")
    review_count: int = 0
    rating_breakdown: dict[int, int] = Field(
        default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    )

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: list[ProductSummaryResponse]
    total: int
    page: int
    page_size: int


class ImageReorderItem(BaseModel):
    id: UUID
    sort_order: int = Field(ge=0)
    is_primary: bool | None = None


class ImageReorderRequest(BaseModel):
    images: list[ImageReorderItem] = Field(min_length=1)


class PublishProductRequest(BaseModel):
    """Optional overrides when publishing."""

    visibility: ProductVisibility | None = None
