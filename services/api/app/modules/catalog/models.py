from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.mixins import AuditMixin


class ProductStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class ProductType(str, enum.Enum):
    simple = "simple"
    variable = "variable"
    bundle = "bundle"


class ProductVisibility(str, enum.Enum):
    visible = "visible"  # catalog + search
    catalog = "catalog"  # catalog only
    search = "search"  # search only
    hidden = "hidden"


class MediaType(str, enum.Enum):
    image = "image"
    video = "video"


class InventoryPolicy(str, enum.Enum):
    deny = "deny"  # stop selling at 0
    continue_ = "continue"  # allow oversell


class RelationType(str, enum.Enum):
    related = "related"
    upsell = "upsell"
    cross_sell = "cross_sell"
    bundle = "bundle"
    variant_group = "variant_group"


class Brand(AuditMixin, Base):
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list[Product]] = relationship(
        back_populates="brand",
        foreign_keys="Product.brand_id",
    )


class Category(AuditMixin, Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    parent: Mapped[Category | None] = relationship(
        remote_side="Category.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list[Category]] = relationship(
        back_populates="parent",
        foreign_keys=[parent_id],
    )
    products: Mapped[list[Product]] = relationship(
        back_populates="category",
        foreign_keys="Product.category_id",
    )


class Tag(AuditMixin, Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    products: Mapped[list[Product]] = relationship(
        secondary="product_tags",
        back_populates="tags",
        lazy="selectin",
    )


class Product(AuditMixin, Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    brand_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    product_type: Mapped[ProductType] = mapped_column(
        Enum(ProductType, name="product_type", native_enum=False),
        default=ProductType.simple,
    )
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status", native_enum=False),
        default=ProductStatus.draft,
        index=True,
    )
    visibility: Mapped[ProductVisibility] = mapped_column(
        Enum(ProductVisibility, name="product_visibility", native_enum=False),
        default=ProductVisibility.visible,
        index=True,
    )

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_organic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_perishable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_shipping: Mapped[bool] = mapped_column(Boolean, default=True)
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=True)

    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    unit_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    tax_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    badge_label: Mapped[str | None] = mapped_column(String(40), nullable=True)

    min_order_qty: Mapped[int] = mapped_column(Integer, default=1)
    max_order_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order_qty_increment: Mapped[int] = mapped_column(Integer, default=1)

    shelf_life_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    origin_country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    origin_region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    allergen_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    nutrition_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)

    meta_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    category: Mapped[Category | None] = relationship(
        back_populates="products",
        foreign_keys=[category_id],
    )
    brand: Mapped[Brand | None] = relationship(
        back_populates="products",
        foreign_keys=[brand_id],
    )
    tags: Mapped[list[Tag]] = relationship(
        secondary="product_tags",
        back_populates="products",
        lazy="selectin",
    )
    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
        lazy="selectin",
    )
    variants: Mapped[list[ProductVariant]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.sort_order",
        lazy="selectin",
    )
    options: Mapped[list[ProductOption]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductOption.position",
        lazy="selectin",
    )
    attributes: Mapped[list[ProductAttribute]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductAttribute.sort_order",
        lazy="selectin",
    )
    relations_from: Mapped[list[ProductRelation]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        foreign_keys="ProductRelation.product_id",
        lazy="selectin",
    )


class ProductTag(Base):
    __tablename__ = "product_tags"
    __table_args__ = (UniqueConstraint("product_id", "tag_id", name="uq_product_tag"),)

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )


class ProductOption(AuditMixin, Base):
    """Variant axis e.g. Pack Size, Grade (Shopify-style product options)."""

    __tablename__ = "product_options"
    __table_args__ = (
        UniqueConstraint("product_id", "name", name="uq_product_option_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=1)

    product: Mapped[Product] = relationship(
        back_populates="options",
        foreign_keys=[product_id],
    )
    values: Mapped[list[ProductOptionValue]] = relationship(
        back_populates="option",
        cascade="all, delete-orphan",
        order_by="ProductOptionValue.sort_order",
        lazy="selectin",
    )


class ProductOptionValue(AuditMixin, Base):
    __tablename__ = "product_option_values"
    __table_args__ = (
        UniqueConstraint("option_id", "value", name="uq_product_option_value"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    option_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_options.id", ondelete="CASCADE"),
        index=True,
    )
    value: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    option: Mapped[ProductOption] = relationship(
        back_populates="values",
        foreign_keys=[option_id],
    )


class ProductAttribute(AuditMixin, Base):
    """Custom specs: Origin Farm, Variety, Brix, Certification, etc."""

    __tablename__ = "product_attributes"
    __table_args__ = (
        UniqueConstraint("product_id", "name", name="uq_product_attribute_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped[Product] = relationship(
        back_populates="attributes",
        foreign_keys=[product_id],
    )


class ProductImage(AuditMixin, Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type", native_enum=False),
        default=MediaType.image,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped[Product] = relationship(
        back_populates="images",
        foreign_keys=[product_id],
    )


class ProductVariant(AuditMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (UniqueConstraint("sku", name="uq_product_variant_sku"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    sku: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gtin: Mapped[str | None] = mapped_column(String(14), nullable=True)

    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Up to 3 option axes (Shopify-compatible)
    option1: Mapped[str | None] = mapped_column(String(120), nullable=True)
    option2: Mapped[str | None] = mapped_column(String(120), nullable=True)
    option3: Mapped[str | None] = mapped_column(String(120), nullable=True)
    option_label: Mapped[str | None] = mapped_column(String(200), nullable=True)

    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    length_cm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    width_cm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)

    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5)
    inventory_policy: Mapped[InventoryPolicy] = mapped_column(
        Enum(
            InventoryPolicy,
            name="inventory_policy",
            native_enum=False,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        default=InventoryPolicy.deny,
    )

    product: Mapped[Product] = relationship(
        back_populates="variants",
        foreign_keys=[product_id],
    )


class ProductRelation(AuditMixin, Base):
    __tablename__ = "product_relations"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "related_product_id",
            "relation_type",
            name="uq_product_relation",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    related_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
    )
    relation_type: Mapped[RelationType] = mapped_column(
        Enum(RelationType, name="relation_type", native_enum=False),
        default=RelationType.related,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship(
        back_populates="relations_from",
        foreign_keys=[product_id],
    )
    related_product: Mapped[Product] = relationship(
        foreign_keys=[related_product_id],
        lazy="selectin",
    )
