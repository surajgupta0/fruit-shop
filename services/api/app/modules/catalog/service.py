from __future__ import annotations

import uuid
from datetime import datetime, timezone

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.inventory.models import InventoryReferenceType
from app.modules.inventory.service import available_qty, record_opening_stock, set_stock
from app.modules.inventory.schemas import InventorySetRequest
from app.modules.review.schemas import ProductRatingSummary
from app.modules.review.service import rating_summaries_for_products, product_rating_summary
from app.modules.catalog.models import (
    Brand,
    Category,
    InventoryPolicy,
    Product,
    ProductAttribute,
    ProductImage,
    ProductOption,
    ProductOptionValue,
    ProductRelation,
    ProductStatus,
    ProductVariant,
    ProductVisibility,
    RelationType,
    Tag,
)
from app.modules.catalog.schemas import (
    BrandCreate,
    BrandResponse,
    BrandUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryTreeResponse,
    CategoryUpdate,
    ImageReorderRequest,
    ProductAttributeCreate,
    ProductAttributeResponse,
    ProductAttributeUpdate,
    ProductCreate,
    ProductDetailResponse,
    ProductImageCreate,
    ProductImageResponse,
    ProductImageUpdate,
    ProductListResponse,
    ProductOptionCreate,
    ProductOptionResponse,
    ProductOptionUpdate,
    ProductOptionValueCreate,
    ProductOptionValueResponse,
    ProductOptionValueUpdate,
    ProductRelationCreate,
    ProductRelationResponse,
    ProductSummaryResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
    PublishProductRequest,
    TagCreate,
    TagResponse,
    TagUpdate,
    slugify,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_uuid(value: str | uuid.UUID, *, label: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}") from exc


def _actor(actor_id: str | uuid.UUID | None) -> uuid.UUID | None:
    if actor_id is None:
        return None
    return _parse_uuid(actor_id, label="actor id")


async def _ensure_unique_slug(
    session: AsyncSession,
    model: type[Category] | type[Tag] | type[Product] | type[Brand],
    slug: str,
    *,
    exclude_id: uuid.UUID | None = None,
) -> str:
    base = slugify(slug)
    candidate = base
    n = 2
    while True:
        query = select(model).where(model.slug == candidate)
        if exclude_id is not None:
            query = query.where(model.id != exclude_id)
        existing = (await session.execute(query)).scalar_one_or_none()
        if existing is None:
            return candidate
        candidate = f"{base}-{n}"
        n += 1


# ---------- brands ----------

async def create_brand(
    payload: BrandCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> BrandResponse:
    slug = await _ensure_unique_slug(session, Brand, payload.slug or payload.name)
    brand = Brand(
        name=payload.name,
        slug=slug,
        description=payload.description,
        logo_url=payload.logo_url,
        website_url=payload.website_url,
        is_active=payload.is_active,
    )
    stamp_create(brand, _actor(actor_id))
    session.add(brand)
    await session.flush()
    return BrandResponse.model_validate(brand)


async def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> BrandResponse:
    brand = await session.get(Brand, _parse_uuid(brand_id, label="brand id"))
    if brand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = await _ensure_unique_slug(session, Brand, data["slug"], exclude_id=brand.id)
    elif "name" in data and data["name"] and "slug" not in data:
        data["slug"] = await _ensure_unique_slug(session, Brand, data["name"], exclude_id=brand.id)
    for key, value in data.items():
        setattr(brand, key, value)
    stamp_update(brand, _actor(actor_id))
    await session.flush()
    return BrandResponse.model_validate(brand)


async def delete_brand(brand_id: str, session: AsyncSession) -> None:
    brand = await session.get(Brand, _parse_uuid(brand_id, label="brand id"))
    if brand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")
    await session.delete(brand)
    await session.flush()


async def list_brands(session: AsyncSession, *, active_only: bool = False) -> list[BrandResponse]:
    query = select(Brand).order_by(Brand.name)
    if active_only:
        query = query.where(Brand.is_active.is_(True))
    result = await session.execute(query)
    return [BrandResponse.model_validate(b) for b in result.scalars().all()]


# ---------- categories ----------

async def create_category(
    payload: CategoryCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> CategoryResponse:
    if payload.parent_id is not None:
        parent = await session.get(Category, payload.parent_id)
        if parent is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Parent category not found")

    slug = await _ensure_unique_slug(session, Category, payload.slug or payload.name)
    category = Category(
        name=payload.name,
        slug=slug,
        description=payload.description,
        image_url=payload.image_url,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    stamp_create(category, _actor(actor_id))
    session.add(category)
    await session.flush()
    return CategoryResponse.model_validate(category)


async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> CategoryResponse:
    category = await session.get(Category, _parse_uuid(category_id, label="category id"))
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")

    data = payload.model_dump(exclude_unset=True)
    if "parent_id" in data and data["parent_id"] is not None:
        if data["parent_id"] == category.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Category cannot be its own parent")
        parent = await session.get(Category, data["parent_id"])
        if parent is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Parent category not found")

    if "slug" in data and data["slug"]:
        data["slug"] = await _ensure_unique_slug(
            session, Category, data["slug"], exclude_id=category.id
        )
    elif "name" in data and data["name"] and "slug" not in data:
        data["slug"] = await _ensure_unique_slug(
            session, Category, data["name"], exclude_id=category.id
        )

    for key, value in data.items():
        setattr(category, key, value)
    stamp_update(category, _actor(actor_id))
    await session.flush()
    return CategoryResponse.model_validate(category)


async def delete_category(category_id: str, session: AsyncSession) -> None:
    category = await session.get(Category, _parse_uuid(category_id, label="category id"))
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    await session.delete(category)
    await session.flush()


async def list_categories(
    session: AsyncSession,
    *,
    active_only: bool = False,
) -> list[CategoryResponse]:
    query = select(Category).order_by(Category.sort_order, Category.name)
    if active_only:
        query = query.where(Category.is_active.is_(True))
    result = await session.execute(query)
    return [CategoryResponse.model_validate(c) for c in result.scalars().all()]


async def category_tree(
    session: AsyncSession,
    *,
    active_only: bool = True,
) -> list[CategoryTreeResponse]:
    categories = await list_categories(session, active_only=active_only)
    by_id: dict[str, CategoryTreeResponse] = {}
    roots: list[CategoryTreeResponse] = []
    for cat in categories:
        node = CategoryTreeResponse(**cat.model_dump(), children=[])
        by_id[str(cat.id)] = node
    for cat in categories:
        node = by_id[str(cat.id)]
        parent_key = str(cat.parent_id) if cat.parent_id else None
        if parent_key and parent_key in by_id:
            by_id[parent_key].children.append(node)
        else:
            roots.append(node)
    return roots


async def get_category(category_id: str, session: AsyncSession) -> CategoryResponse:
    category = await session.get(Category, _parse_uuid(category_id, label="category id"))
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryResponse.model_validate(category)


async def get_category_by_slug(
    slug: str, session: AsyncSession, *, active_only: bool = False
) -> CategoryResponse:
    category = (
        await session.execute(select(Category).where(Category.slug == slug))
    ).scalar_one_or_none()
    if category is None or (active_only and not category.is_active):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryResponse.model_validate(category)


# ---------- tags ----------

async def create_tag(
    payload: TagCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> TagResponse:
    slug = await _ensure_unique_slug(session, Tag, payload.slug or payload.name)
    tag = Tag(name=payload.name, slug=slug)
    stamp_create(tag, _actor(actor_id))
    session.add(tag)
    await session.flush()
    return TagResponse.model_validate(tag)


async def update_tag(
    tag_id: str,
    payload: TagUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> TagResponse:
    tag = await session.get(Tag, _parse_uuid(tag_id, label="tag id"))
    if tag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tag not found")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = await _ensure_unique_slug(session, Tag, data["slug"], exclude_id=tag.id)
    elif "name" in data and data["name"] and "slug" not in data:
        data["slug"] = await _ensure_unique_slug(session, Tag, data["name"], exclude_id=tag.id)
    for key, value in data.items():
        setattr(tag, key, value)
    stamp_update(tag, _actor(actor_id))
    await session.flush()
    return TagResponse.model_validate(tag)


async def delete_tag(tag_id: str, session: AsyncSession) -> None:
    tag = await session.get(Tag, _parse_uuid(tag_id, label="tag id"))
    if tag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tag not found")
    await session.delete(tag)
    await session.flush()


async def list_tags(session: AsyncSession) -> list[TagResponse]:
    result = await session.execute(select(Tag).order_by(Tag.name))
    return [TagResponse.model_validate(t) for t in result.scalars().all()]


# ---------- products helpers ----------

def _product_load_options():
    return (
        selectinload(Product.category),
        selectinload(Product.brand),
        selectinload(Product.tags),
        selectinload(Product.images),
        selectinload(Product.variants),
        selectinload(Product.options).selectinload(ProductOption.values),
        selectinload(Product.attributes),
        selectinload(Product.relations_from).selectinload(ProductRelation.related_product),
    )


async def _get_product(product_id: str | uuid.UUID, session: AsyncSession) -> Product:
    result = await session.execute(
        select(Product)
        .where(Product.id == _parse_uuid(product_id, label="product id"))
        .options(*_product_load_options())
        .execution_options(populate_existing=True)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def _get_product_by_slug(slug: str, session: AsyncSession) -> Product:
    result = await session.execute(
        select(Product)
        .where(Product.slug == slug)
        .options(*_product_load_options())
        .execution_options(populate_existing=True)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def _load_tags(tag_ids: list[uuid.UUID], session: AsyncSession) -> list[Tag]:
    if not tag_ids:
        return []
    result = await session.execute(select(Tag).where(Tag.id.in_(tag_ids)))
    tags = list(result.scalars().all())
    if len(tags) != len(set(tag_ids)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="One or more tags not found")
    return tags


async def _clear_primary_images(product_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    for img in result.scalars().all():
        img.is_primary = False


async def _clear_default_variants(product_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(
        select(ProductVariant).where(ProductVariant.product_id == product_id)
    )
    for variant in result.scalars().all():
        variant.is_default = False


def _variant_response(v: ProductVariant) -> ProductVariantResponse:
    data = ProductVariantResponse.model_validate(v)
    data.inventory_policy = (
        v.inventory_policy.value
        if hasattr(v.inventory_policy, "value")
        else str(v.inventory_policy)
    )
    data.reserved_qty = int(getattr(v, "reserved_qty", 0) or 0)
    data.available_qty = available_qty(v)
    return data


def _image_response(i: ProductImage) -> ProductImageResponse:
    data = ProductImageResponse.model_validate(i)
    data.media_type = i.media_type.value if hasattr(i.media_type, "value") else str(i.media_type)
    return data


def to_summary(
    product: Product,
    *,
    rating: ProductRatingSummary | None = None,
) -> ProductSummaryResponse:
    active_variants = [v for v in product.variants if v.is_active]
    prices = [v.price for v in active_variants]
    total_stock = sum(available_qty(v) for v in active_variants)
    if product.track_inventory:
        in_stock = any(
            available_qty(v) > 0 or v.inventory_policy == InventoryPolicy.continue_
            for v in active_variants
        )
    else:
        in_stock = bool(active_variants)
    primary = next((i for i in product.images if i.is_primary), None)
    if primary is None and product.images:
        primary = product.images[0]
    return ProductSummaryResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        status=product.status.value,
        visibility=product.visibility.value,
        product_type=product.product_type.value,
        is_featured=product.is_featured,
        is_organic=product.is_organic,
        badge_label=product.badge_label,
        unit_label=product.unit_label,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        brand_id=product.brand_id,
        brand_name=product.brand.name if product.brand else None,
        primary_image_url=primary.url if primary else None,
        min_price=min(prices) if prices else None,
        max_price=max(prices) if prices else None,
        in_stock=in_stock,
        total_stock=total_stock,
        average_rating=rating.average_rating if rating else Decimal("0.00"),
        review_count=rating.review_count if rating else 0,
        tag_slugs=[t.slug for t in product.tags],
        created_at=product.created_at,
        updated_at=product.updated_at,
        created_by=product.created_by,
        updated_by=product.updated_by,
    )


def to_detail(
    product: Product,
    *,
    rating: ProductRatingSummary | None = None,
) -> ProductDetailResponse:
    relations: list[ProductRelationResponse] = []
    for rel in product.relations_from:
        related = rel.related_product
        relations.append(
            ProductRelationResponse(
                id=rel.id,
                related_product_id=rel.related_product_id,
                relation_type=rel.relation_type.value,
                sort_order=rel.sort_order,
                related_name=related.name if related else None,
                related_slug=related.slug if related else None,
                created_at=rel.created_at,
                updated_at=rel.updated_at,
                created_by=rel.created_by,
                updated_by=rel.updated_by,
            )
        )

    options = [
        ProductOptionResponse(
            id=opt.id,
            name=opt.name,
            position=opt.position,
            values=[ProductOptionValueResponse.model_validate(v) for v in opt.values],
            created_at=opt.created_at,
            updated_at=opt.updated_at,
            created_by=opt.created_by,
            updated_by=opt.updated_by,
        )
        for opt in product.options
    ]

    return ProductDetailResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        description=product.description,
        product_type=product.product_type.value,
        status=product.status.value,
        visibility=product.visibility.value,
        is_featured=product.is_featured,
        is_organic=product.is_organic,
        is_perishable=product.is_perishable,
        is_taxable=product.is_taxable,
        requires_shipping=product.requires_shipping,
        track_inventory=product.track_inventory,
        vendor=product.vendor,
        unit_label=product.unit_label,
        hsn_code=product.hsn_code,
        tax_percent=product.tax_percent,
        badge_label=product.badge_label,
        min_order_qty=product.min_order_qty,
        max_order_qty=product.max_order_qty,
        order_qty_increment=product.order_qty_increment,
        shelf_life_days=product.shelf_life_days,
        storage_instructions=product.storage_instructions,
        origin_country=product.origin_country,
        origin_region=product.origin_region,
        allergen_info=product.allergen_info,
        nutrition_info=product.nutrition_info,
        search_keywords=product.search_keywords,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        published_at=product.published_at,
        sort_order=product.sort_order,
        category_id=product.category_id,
        brand_id=product.brand_id,
        category=CategoryResponse.model_validate(product.category) if product.category else None,
        brand=BrandResponse.model_validate(product.brand) if product.brand else None,
        tags=[TagResponse.model_validate(t) for t in product.tags],
        options=options,
        attributes=[ProductAttributeResponse.model_validate(a) for a in product.attributes],
        images=[_image_response(i) for i in product.images],
        variants=[_variant_response(v) for v in product.variants],
        relations=relations,
        average_rating=rating.average_rating if rating else Decimal("0.00"),
        review_count=rating.review_count if rating else 0,
        rating_breakdown=rating.rating_breakdown if rating else {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        created_at=product.created_at,
        updated_at=product.updated_at,
        created_by=product.created_by,
        updated_by=product.updated_by,
    )


async def _detail_with_ratings(
    product: Product,
    session: AsyncSession,
) -> ProductDetailResponse:
    rating = await product_rating_summary(product.id, session)
    return to_detail(product, rating=rating)


# ---------- products ----------

async def create_product(
    payload: ProductCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductDetailResponse:
    if payload.category_id is not None:
        if await session.get(Category, payload.category_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    if payload.brand_id is not None:
        if await session.get(Brand, payload.brand_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")

    actor = _actor(actor_id)
    slug = await _ensure_unique_slug(session, Product, payload.slug or payload.name)
    tags = await _load_tags(payload.tag_ids, session)

    # Deduplicate SKUs in payload and against existing variants
    skus = [v.sku for v in payload.variants]
    if len(skus) != len(set(skus)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Duplicate SKUs in variants")
    if skus:
        existing = (
            await session.execute(select(ProductVariant.sku).where(ProductVariant.sku.in_(skus)))
        ).scalars().all()
        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"SKU already exists: {', '.join(sorted(existing))}",
            )

    product = Product(
        name=payload.name,
        slug=slug,
        short_description=payload.short_description,
        description=payload.description,
        category_id=payload.category_id,
        brand_id=payload.brand_id,
        product_type=payload.product_type,
        status=payload.status,
        visibility=payload.visibility,
        is_featured=payload.is_featured,
        is_organic=payload.is_organic,
        is_perishable=payload.is_perishable,
        is_taxable=payload.is_taxable,
        requires_shipping=payload.requires_shipping,
        track_inventory=payload.track_inventory,
        vendor=payload.vendor,
        unit_label=payload.unit_label,
        hsn_code=payload.hsn_code,
        tax_percent=payload.tax_percent,
        badge_label=payload.badge_label,
        min_order_qty=payload.min_order_qty,
        max_order_qty=payload.max_order_qty,
        order_qty_increment=payload.order_qty_increment,
        shelf_life_days=payload.shelf_life_days,
        storage_instructions=payload.storage_instructions,
        origin_country=payload.origin_country.upper() if payload.origin_country else None,
        origin_region=payload.origin_region,
        allergen_info=payload.allergen_info,
        nutrition_info=payload.nutrition_info,
        search_keywords=payload.search_keywords,
        meta_title=payload.meta_title,
        meta_description=payload.meta_description,
        sort_order=payload.sort_order,
        published_at=_utcnow() if payload.status == ProductStatus.active else None,
        tags=tags,
    )
    stamp_create(product, actor)
    session.add(product)
    await session.flush()

    for opt in payload.options:
        option = ProductOption(
            product_id=product.id,
            name=opt.name,
            position=opt.position,
        )
        stamp_create(option, actor)
        session.add(option)
        await session.flush()
        for val in opt.values:
            ov = ProductOptionValue(
                option_id=option.id,
                value=val.value,
                sort_order=val.sort_order,
            )
            stamp_create(ov, actor)
            session.add(ov)

    for attr in payload.attributes:
        pa = ProductAttribute(
            product_id=product.id,
            name=attr.name,
            value=attr.value,
            sort_order=attr.sort_order,
            is_visible=attr.is_visible,
        )
        stamp_create(pa, actor)
        session.add(pa)

    for idx, img in enumerate(payload.images):
        image = ProductImage(
            product_id=product.id,
            url=img.url,
            alt_text=img.alt_text,
            media_type=img.media_type,
            sort_order=img.sort_order if img.sort_order else idx,
            is_primary=img.is_primary,
        )
        stamp_create(image, actor)
        session.add(image)

    if payload.images and not any(i.is_primary for i in payload.images):
        first = (
            await session.execute(
                select(ProductImage)
                .where(ProductImage.product_id == product.id)
                .order_by(ProductImage.sort_order)
                .limit(1)
            )
        ).scalar_one_or_none()
        if first:
            first.is_primary = True

    has_default = any(v.is_default for v in payload.variants)
    for idx, var in enumerate(payload.variants):
        label = var.option_label or " / ".join(
            x for x in (var.option1, var.option2, var.option3) if x
        ) or var.name
        variant = ProductVariant(
            product_id=product.id,
            sku=var.sku,
            name=var.name,
            barcode=var.barcode,
            gtin=var.gtin,
            price=var.price,
            compare_at_price=var.compare_at_price,
            cost_price=var.cost_price,
            option1=var.option1,
            option2=var.option2,
            option3=var.option3,
            option_label=label or None,
            weight_grams=var.weight_grams,
            length_cm=var.length_cm,
            width_cm=var.width_cm,
            height_cm=var.height_cm,
            is_default=var.is_default or (idx == 0 and not has_default),
            is_active=var.is_active,
            sort_order=var.sort_order if var.sort_order else idx,
            stock_qty=var.stock_qty,
            low_stock_threshold=var.low_stock_threshold,
            inventory_policy=var.inventory_policy,
        )
        stamp_create(variant, actor)
        session.add(variant)

    for rel in payload.relations:
        if rel.related_product_id == product.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, detail="Cannot relate product to itself"
            )
        related = await session.get(Product, rel.related_product_id)
        if related is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Related product not found")
        relation = ProductRelation(
            product_id=product.id,
            related_product_id=rel.related_product_id,
            relation_type=rel.relation_type,
            sort_order=rel.sort_order,
        )
        stamp_create(relation, actor)
        session.add(relation)

    await session.flush()
    # Opening stock ledger entries for created variants
    product_loaded = await _get_product(product.id, session)
    for variant in product_loaded.variants:
        await record_opening_stock(variant, session, actor_id=actor)
    return to_detail(await _get_product(product.id, session))


async def update_product(
    product_id: str,
    payload: ProductUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductDetailResponse:
    product = await _get_product(product_id, session)
    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)

    if "category_id" in data and data["category_id"] is not None:
        if await session.get(Category, data["category_id"]) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    if "brand_id" in data and data["brand_id"] is not None:
        if await session.get(Brand, data["brand_id"]) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")

    if "slug" in data and data["slug"]:
        data["slug"] = await _ensure_unique_slug(
            session, Product, data["slug"], exclude_id=product.id
        )
    elif "name" in data and data["name"] and "slug" not in data:
        data["slug"] = await _ensure_unique_slug(
            session, Product, data["name"], exclude_id=product.id
        )

    if "origin_country" in data and data["origin_country"]:
        data["origin_country"] = data["origin_country"].upper()

    if "status" in data:
        new_status = data["status"]
        if new_status == ProductStatus.active:
            if not product.variants:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail="Active products require at least one variant",
                )
            if product.published_at is None:
                product.published_at = _utcnow()

    for key, value in data.items():
        setattr(product, key, value)

    if tag_ids is not None:
        product.tags = await _load_tags(tag_ids, session)

    stamp_update(product, _actor(actor_id))
    await session.flush()
    return to_detail(await _get_product(product.id, session))


async def delete_product(product_id: str, session: AsyncSession) -> None:
    product = await session.get(Product, _parse_uuid(product_id, label="product id"))
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    await session.delete(product)
    await session.flush()


async def get_product(product_id: str, session: AsyncSession) -> ProductDetailResponse:
    return await _detail_with_ratings(await _get_product(product_id, session), session)


async def get_product_by_slug(
    slug: str,
    session: AsyncSession,
    *,
    public_only: bool = False,
) -> ProductDetailResponse:
    product = await _get_product_by_slug(slug, session)
    if public_only and (
        product.status != ProductStatus.active
        or product.visibility == ProductVisibility.hidden
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return await _detail_with_ratings(product, session)


async def list_products(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    category_id: str | None = None,
    brand_id: str | None = None,
    tag_slug: str | None = None,
    search: str | None = None,
    featured: bool | None = None,
    organic: bool | None = None,
    public_only: bool = False,
) -> ProductListResponse:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.brand),
        selectinload(Product.tags),
        selectinload(Product.images),
        selectinload(Product.variants),
    )
    count_query = select(func.count()).select_from(Product)

    if public_only:
        query = query.where(
            Product.status == ProductStatus.active,
            Product.visibility.in_(
                [ProductVisibility.visible, ProductVisibility.catalog, ProductVisibility.search]
            ),
        )
        count_query = count_query.where(
            Product.status == ProductStatus.active,
            Product.visibility.in_(
                [ProductVisibility.visible, ProductVisibility.catalog, ProductVisibility.search]
            ),
        )
    elif status_filter:
        try:
            st = ProductStatus(status_filter)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid status") from exc
        query = query.where(Product.status == st)
        count_query = count_query.where(Product.status == st)

    if category_id:
        cid = _parse_uuid(category_id, label="category id")
        query = query.where(Product.category_id == cid)
        count_query = count_query.where(Product.category_id == cid)

    if brand_id:
        bid = _parse_uuid(brand_id, label="brand id")
        query = query.where(Product.brand_id == bid)
        count_query = count_query.where(Product.brand_id == bid)

    if tag_slug:
        query = query.join(Product.tags).where(Tag.slug == tag_slug)
        count_query = count_query.join(Product.tags).where(Tag.slug == tag_slug)

    if featured is not None:
        query = query.where(Product.is_featured.is_(featured))
        count_query = count_query.where(Product.is_featured.is_(featured))

    if organic is not None:
        query = query.where(Product.is_organic.is_(organic))
        count_query = count_query.where(Product.is_organic.is_(organic))

    if search:
        pattern = f"%{search}%"
        filt = or_(
            Product.name.ilike(pattern),
            Product.slug.ilike(pattern),
            Product.search_keywords.ilike(pattern),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await session.execute(count_query)).scalar_one()
    result = await session.execute(
        query.order_by(Product.sort_order, Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    products = list(result.scalars().unique().all())
    ratings = await rating_summaries_for_products([p.id for p in products], session)
    return ProductListResponse(
        items=[to_summary(p, rating=ratings.get(p.id)) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------- images ----------

async def add_image(
    product_id: str,
    payload: ProductImageCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductImageResponse:
    product = await _get_product(product_id, session)
    if payload.is_primary:
        await _clear_primary_images(product.id, session)
    image = ProductImage(
        product_id=product.id,
        url=payload.url,
        alt_text=payload.alt_text,
        media_type=payload.media_type,
        sort_order=payload.sort_order,
        is_primary=payload.is_primary,
    )
    stamp_create(image, _actor(actor_id))
    session.add(image)
    await session.flush()
    return _image_response(image)


async def update_image(
    product_id: str,
    image_id: str,
    payload: ProductImageUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductImageResponse:
    product = await _get_product(product_id, session)
    image = await session.get(ProductImage, _parse_uuid(image_id, label="image id"))
    if image is None or image.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Image not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_primary"):
        await _clear_primary_images(product.id, session)
    for key, value in data.items():
        setattr(image, key, value)
    stamp_update(image, _actor(actor_id))
    await session.flush()
    return _image_response(image)


async def delete_image(product_id: str, image_id: str, session: AsyncSession) -> None:
    product = await _get_product(product_id, session)
    image = await session.get(ProductImage, _parse_uuid(image_id, label="image id"))
    if image is None or image.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Image not found")
    await session.delete(image)
    await session.flush()


# ---------- variants ----------

async def add_variant(
    product_id: str,
    payload: ProductVariantCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductVariantResponse:
    product = await _get_product(product_id, session)
    clash = await session.execute(select(ProductVariant).where(ProductVariant.sku == payload.sku))
    if clash.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="SKU already exists")

    if payload.is_default:
        await _clear_default_variants(product.id, session)

    variant = ProductVariant(
        product_id=product.id,
        sku=payload.sku,
        name=payload.name,
        barcode=payload.barcode,
        gtin=payload.gtin,
        price=payload.price,
        compare_at_price=payload.compare_at_price,
        cost_price=payload.cost_price,
        option1=payload.option1,
        option2=payload.option2,
        option3=payload.option3,
        option_label=payload.option_label
        or " / ".join(x for x in (payload.option1, payload.option2, payload.option3) if x)
        or None,
        weight_grams=payload.weight_grams,
        length_cm=payload.length_cm,
        width_cm=payload.width_cm,
        height_cm=payload.height_cm,
        is_default=payload.is_default,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
        stock_qty=payload.stock_qty,
        low_stock_threshold=payload.low_stock_threshold,
        inventory_policy=payload.inventory_policy,
    )
    stamp_create(variant, _actor(actor_id))
    session.add(variant)
    await session.flush()
    await record_opening_stock(variant, session, actor_id=_actor(actor_id))
    return _variant_response(variant)


async def update_variant(
    product_id: str,
    variant_id: str,
    payload: ProductVariantUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductVariantResponse:
    product = await _get_product(product_id, session)
    variant = await session.get(ProductVariant, _parse_uuid(variant_id, label="variant id"))
    if variant is None or variant.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")

    data = payload.model_dump(exclude_unset=True)
    if "sku" in data and data["sku"]:
        clash = await session.execute(
            select(ProductVariant).where(
                ProductVariant.sku == data["sku"], ProductVariant.id != variant.id
            )
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="SKU already exists")

    if data.get("is_default"):
        await _clear_default_variants(product.id, session)

    stock_qty = data.pop("stock_qty", None)
    for key, value in data.items():
        setattr(variant, key, value)
    stamp_update(variant, _actor(actor_id))
    await session.flush()

    if stock_qty is not None:
        await set_stock(
            InventorySetRequest(
                variant_id=variant.id,
                stock_qty=stock_qty,
                reason="Catalog stock update",
            ),
            session,
            actor_id=actor_id,
            reference_type=InventoryReferenceType.catalog,
            reference_id=variant.id,
        )
        await session.refresh(variant)

    return _variant_response(variant)


async def delete_variant(product_id: str, variant_id: str, session: AsyncSession) -> None:
    product = await _get_product(product_id, session)
    variant = await session.get(ProductVariant, _parse_uuid(variant_id, label="variant id"))
    if variant is None or variant.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Variant not found")
    await session.delete(variant)
    await session.flush()


# ---------- relations ----------

async def add_relation(
    product_id: str,
    payload: ProductRelationCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductRelationResponse:
    product = await _get_product(product_id, session)
    related_id = payload.related_product_id
    if related_id == product.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot relate product to itself")

    related = await session.get(Product, related_id)
    if related is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Related product not found")

    existing = await session.execute(
        select(ProductRelation).where(
            ProductRelation.product_id == product.id,
            ProductRelation.related_product_id == related_id,
            ProductRelation.relation_type == payload.relation_type,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Relation already exists")

    relation = ProductRelation(
        product_id=product.id,
        related_product_id=related_id,
        relation_type=payload.relation_type,
        sort_order=payload.sort_order,
    )
    stamp_create(relation, _actor(actor_id))
    session.add(relation)
    await session.flush()
    return ProductRelationResponse(
        id=relation.id,
        related_product_id=related.id,
        relation_type=relation.relation_type.value,
        sort_order=relation.sort_order,
        related_name=related.name,
        related_slug=related.slug,
        created_at=relation.created_at,
        updated_at=relation.updated_at,
        created_by=relation.created_by,
        updated_by=relation.updated_by,
    )


async def delete_relation(product_id: str, relation_id: str, session: AsyncSession) -> None:
    product = await _get_product(product_id, session)
    relation = await session.get(ProductRelation, _parse_uuid(relation_id, label="relation id"))
    if relation is None or relation.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Relation not found")
    await session.delete(relation)
    await session.flush()


async def list_relations(
    product_id: str,
    session: AsyncSession,
    *,
    relation_type: str | None = None,
) -> list[ProductRelationResponse]:
    product = await _get_product(product_id, session)
    items = product.relations_from
    if relation_type:
        try:
            rt = RelationType(relation_type)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid relation type") from exc
        items = [r for r in items if r.relation_type == rt]

    out: list[ProductRelationResponse] = []
    for rel in sorted(items, key=lambda r: r.sort_order):
        related = rel.related_product
        out.append(
            ProductRelationResponse(
                id=rel.id,
                related_product_id=rel.related_product_id,
                relation_type=rel.relation_type.value,
                sort_order=rel.sort_order,
                related_name=related.name if related else None,
                related_slug=related.slug if related else None,
                created_at=rel.created_at,
                updated_at=rel.updated_at,
                created_by=rel.created_by,
                updated_by=rel.updated_by,
            )
        )
    return out


# ---------- attributes ----------

async def add_attribute(
    product_id: str,
    payload: ProductAttributeCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductAttributeResponse:
    product = await _get_product(product_id, session)
    attr = ProductAttribute(
        product_id=product.id,
        name=payload.name,
        value=payload.value,
        sort_order=payload.sort_order,
        is_visible=payload.is_visible,
    )
    stamp_create(attr, _actor(actor_id))
    session.add(attr)
    await session.flush()
    return ProductAttributeResponse.model_validate(attr)


async def update_attribute(
    product_id: str,
    attribute_id: str,
    payload: ProductAttributeUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductAttributeResponse:
    product = await _get_product(product_id, session)
    attr = await session.get(ProductAttribute, _parse_uuid(attribute_id, label="attribute id"))
    if attr is None or attr.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(attr, key, value)
    stamp_update(attr, _actor(actor_id))
    await session.flush()
    return ProductAttributeResponse.model_validate(attr)


async def delete_attribute(product_id: str, attribute_id: str, session: AsyncSession) -> None:
    product = await _get_product(product_id, session)
    attr = await session.get(ProductAttribute, _parse_uuid(attribute_id, label="attribute id"))
    if attr is None or attr.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    await session.delete(attr)
    await session.flush()


# ---------- options ----------

def _option_response(option: ProductOption) -> ProductOptionResponse:
    return ProductOptionResponse(
        id=option.id,
        name=option.name,
        position=option.position,
        values=[ProductOptionValueResponse.model_validate(v) for v in option.values],
        created_at=option.created_at,
        updated_at=option.updated_at,
        created_by=option.created_by,
        updated_by=option.updated_by,
    )


async def add_option(
    product_id: str,
    payload: ProductOptionCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductOptionResponse:
    product = await _get_product(product_id, session)
    if len(product.options) >= 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Maximum 3 product options")
    if any(o.name.lower() == payload.name.lower() for o in product.options):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Option name already exists")

    actor = _actor(actor_id)
    option = ProductOption(
        product_id=product.id,
        name=payload.name,
        position=payload.position,
    )
    stamp_create(option, actor)
    session.add(option)
    await session.flush()
    option_id = option.id
    for val in payload.values:
        ov = ProductOptionValue(
            option_id=option_id,
            value=val.value,
            sort_order=val.sort_order,
        )
        stamp_create(ov, actor)
        session.add(ov)
    await session.flush()
    product = await _get_product(product.id, session)
    option = next((o for o in product.options if o.id == option_id), None)
    if option is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    return _option_response(option)


async def update_option(
    product_id: str,
    option_id: str,
    payload: ProductOptionUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductOptionResponse:
    product = await _get_product(product_id, session)
    option = await session.get(ProductOption, _parse_uuid(option_id, label="option id"))
    if option is None or option.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        if any(
            o.name.lower() == data["name"].lower() and o.id != option.id
            for o in product.options
        ):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Option name already exists")
    for key, value in data.items():
        setattr(option, key, value)
    stamp_update(option, _actor(actor_id))
    await session.flush()
    product = await _get_product(product.id, session)
    option = next((o for o in product.options if o.id == option.id), None)
    if option is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    return _option_response(option)


async def delete_option(product_id: str, option_id: str, session: AsyncSession) -> None:
    product = await _get_product(product_id, session)
    option = await session.get(ProductOption, _parse_uuid(option_id, label="option id"))
    if option is None or option.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    await session.delete(option)
    await session.flush()


async def add_option_value(
    product_id: str,
    option_id: str,
    payload: ProductOptionValueCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductOptionValueResponse:
    product = await _get_product(product_id, session)
    option = await session.get(ProductOption, _parse_uuid(option_id, label="option id"))
    if option is None or option.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    if any(v.value.lower() == payload.value.lower() for v in option.values):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Option value already exists")
    ov = ProductOptionValue(
        option_id=option.id,
        value=payload.value,
        sort_order=payload.sort_order,
    )
    stamp_create(ov, _actor(actor_id))
    session.add(ov)
    await session.flush()
    return ProductOptionValueResponse.model_validate(ov)


async def update_option_value(
    product_id: str,
    option_id: str,
    value_id: str,
    payload: ProductOptionValueUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductOptionValueResponse:
    product = await _get_product(product_id, session)
    option = await session.get(ProductOption, _parse_uuid(option_id, label="option id"))
    if option is None or option.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    ov = await session.get(ProductOptionValue, _parse_uuid(value_id, label="option value id"))
    if ov is None or ov.option_id != option.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option value not found")
    data = payload.model_dump(exclude_unset=True)
    if "value" in data and data["value"]:
        if any(
            v.value.lower() == data["value"].lower() and v.id != ov.id for v in option.values
        ):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Option value already exists")
    for key, value in data.items():
        setattr(ov, key, value)
    stamp_update(ov, _actor(actor_id))
    await session.flush()
    return ProductOptionValueResponse.model_validate(ov)


async def delete_option_value(
    product_id: str, option_id: str, value_id: str, session: AsyncSession
) -> None:
    product = await _get_product(product_id, session)
    option = await session.get(ProductOption, _parse_uuid(option_id, label="option id"))
    if option is None or option.product_id != product.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option not found")
    ov = await session.get(ProductOptionValue, _parse_uuid(value_id, label="option value id"))
    if ov is None or ov.option_id != option.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Option value not found")
    await session.delete(ov)
    await session.flush()


# ---------- slug lookups ----------

async def get_brand(brand_id: str, session: AsyncSession) -> BrandResponse:
    brand = await session.get(Brand, _parse_uuid(brand_id, label="brand id"))
    if brand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return BrandResponse.model_validate(brand)


async def get_brand_by_slug(
    slug: str, session: AsyncSession, *, active_only: bool = False
) -> BrandResponse:
    brand = (
        await session.execute(select(Brand).where(Brand.slug == slug))
    ).scalar_one_or_none()
    if brand is None or (active_only and not brand.is_active):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return BrandResponse.model_validate(brand)


async def get_tag_by_slug(slug: str, session: AsyncSession) -> TagResponse:
    tag = (await session.execute(select(Tag).where(Tag.slug == slug))).scalar_one_or_none()
    if tag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return TagResponse.model_validate(tag)


# ---------- publish / reorder ----------

async def publish_product(
    product_id: str,
    session: AsyncSession,
    *,
    actor_id: str,
    payload: PublishProductRequest | None = None,
) -> ProductDetailResponse:
    product = await _get_product(product_id, session)
    if not product.variants:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Active products require at least one variant",
        )
    product.status = ProductStatus.active
    if product.published_at is None:
        product.published_at = _utcnow()
    if payload and payload.visibility is not None:
        product.visibility = payload.visibility
    elif product.visibility == ProductVisibility.hidden:
        product.visibility = ProductVisibility.visible
    stamp_update(product, _actor(actor_id))
    await session.flush()
    return to_detail(await _get_product(product.id, session))


async def unpublish_product(
    product_id: str,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ProductDetailResponse:
    product = await _get_product(product_id, session)
    product.status = ProductStatus.draft
    stamp_update(product, _actor(actor_id))
    await session.flush()
    return to_detail(await _get_product(product.id, session))


async def reorder_images(
    product_id: str,
    payload: ImageReorderRequest,
    session: AsyncSession,
    *,
    actor_id: str,
) -> list[ProductImageResponse]:
    product = await _get_product(product_id, session)
    by_id = {img.id: img for img in product.images}
    primary_set = False
    for item in payload.images:
        img = by_id.get(item.id)
        if img is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Image {item.id} not found")
        img.sort_order = item.sort_order
        if item.is_primary is True:
            await _clear_primary_images(product.id, session)
            img.is_primary = True
            primary_set = True
        elif item.is_primary is False:
            img.is_primary = False
        stamp_update(img, _actor(actor_id))
    if not primary_set and product.images and not any(i.is_primary for i in product.images):
        first = sorted(product.images, key=lambda i: i.sort_order)[0]
        first.is_primary = True
        stamp_update(first, _actor(actor_id))
    await session.flush()
    product = await _get_product(product.id, session)
    return [_image_response(i) for i in product.images]
