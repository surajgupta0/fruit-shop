from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.catalog import service as catalog_service
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
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
    PublishProductRequest,
    TagCreate,
    TagResponse,
    TagUpdate,
)
from app.modules.users.rbac import CATALOG_MANAGE

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="catalog")


# ---------- public storefront ----------

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories_public(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CategoryResponse]:
    return await catalog_service.list_categories(session, active_only=True)


@router.get("/categories/tree", response_model=list[CategoryTreeResponse])
async def category_tree_public(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CategoryTreeResponse]:
    return await catalog_service.category_tree(session, active_only=True)


@router.get("/categories/by-slug/{slug}", response_model=CategoryResponse)
async def get_category_by_slug_public(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CategoryResponse:
    return await catalog_service.get_category_by_slug(slug, session, active_only=True)


@router.get("/brands", response_model=list[BrandResponse])
async def list_brands_public(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BrandResponse]:
    return await catalog_service.list_brands(session, active_only=True)


@router.get("/brands/by-slug/{slug}", response_model=BrandResponse)
async def get_brand_by_slug_public(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BrandResponse:
    return await catalog_service.get_brand_by_slug(slug, session, active_only=True)


@router.get("/tags", response_model=list[TagResponse])
async def list_tags_public(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TagResponse]:
    return await catalog_service.list_tags(session)


@router.get("/tags/by-slug/{slug}", response_model=TagResponse)
async def get_tag_by_slug_public(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TagResponse:
    return await catalog_service.get_tag_by_slug(slug, session)


@router.get("/products", response_model=ProductListResponse)
async def list_products_public(
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: str | None = None,
    brand_id: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    featured: bool | None = None,
    organic: bool | None = None,
) -> ProductListResponse:
    return await catalog_service.list_products(
        session,
        page=page,
        page_size=page_size,
        category_id=category_id,
        brand_id=brand_id,
        tag_slug=tag,
        search=search,
        featured=featured,
        organic=organic,
        public_only=True,
    )


@router.get("/products/by-slug/{slug}", response_model=ProductDetailResponse)
async def get_product_by_slug_public(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    return await catalog_service.get_product_by_slug(slug, session, public_only=True)


@router.get("/products/{product_id}", response_model=ProductDetailResponse)
async def get_product_public(
    product_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    product = await catalog_service.get_product(str(product_id), session)
    if product.status != "active" or product.visibility == "hidden":
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ---------- admin / staff manage ----------

@router.post(
    "/admin/brands",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_brand(
    body: BrandCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BrandResponse:
    return await catalog_service.create_brand(body, session, actor_id=actor.sub)


@router.patch("/admin/brands/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: UUID,
    body: BrandUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BrandResponse:
    return await catalog_service.update_brand(str(brand_id), body, session, actor_id=actor.sub)


@router.delete("/admin/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_brand(str(brand_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/brands", response_model=list[BrandResponse])
async def list_brands_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BrandResponse]:
    return await catalog_service.list_brands(session, active_only=False)


@router.get("/admin/brands/{brand_id}", response_model=BrandResponse)
async def get_brand_admin(
    brand_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BrandResponse:
    return await catalog_service.get_brand(str(brand_id), session)


@router.post(
    "/admin/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    body: CategoryCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CategoryResponse:
    return await catalog_service.create_category(body, session, actor_id=actor.sub)


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    body: CategoryUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CategoryResponse:
    return await catalog_service.update_category(
        str(category_id), body, session, actor_id=actor.sub
    )


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_category(str(category_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/categories", response_model=list[CategoryResponse])
async def list_categories_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CategoryResponse]:
    return await catalog_service.list_categories(session, active_only=False)


@router.get("/admin/categories/{category_id}", response_model=CategoryResponse)
async def get_category_admin(
    category_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CategoryResponse:
    return await catalog_service.get_category(str(category_id), session)


@router.post("/admin/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    body: TagCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TagResponse:
    return await catalog_service.create_tag(body, session, actor_id=actor.sub)


@router.get("/admin/tags", response_model=list[TagResponse])
async def list_tags_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TagResponse]:
    return await catalog_service.list_tags(session)


@router.patch("/admin/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    body: TagUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TagResponse:
    return await catalog_service.update_tag(str(tag_id), body, session, actor_id=actor.sub)


@router.delete("/admin/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_tag(str(tag_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/products", response_model=ProductListResponse)
async def list_products_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    category_id: str | None = None,
    brand_id: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    featured: bool | None = None,
    organic: bool | None = None,
) -> ProductListResponse:
    return await catalog_service.list_products(
        session,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        category_id=category_id,
        brand_id=brand_id,
        tag_slug=tag,
        search=search,
        featured=featured,
        organic=organic,
        public_only=False,
    )


@router.post(
    "/admin/products",
    response_model=ProductDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    body: ProductCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    return await catalog_service.create_product(body, session, actor_id=actor.sub)


@router.get("/admin/products/{product_id}", response_model=ProductDetailResponse)
async def get_product_admin(
    product_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    return await catalog_service.get_product(str(product_id), session)


@router.patch("/admin/products/{product_id}", response_model=ProductDetailResponse)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    return await catalog_service.update_product(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.delete("/admin/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_product(str(product_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/products/{product_id}/publish",
    response_model=ProductDetailResponse,
)
async def publish_product(
    product_id: UUID,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    body: PublishProductRequest | None = None,
) -> ProductDetailResponse:
    return await catalog_service.publish_product(
        str(product_id), session, actor_id=actor.sub, payload=body
    )


@router.post(
    "/admin/products/{product_id}/unpublish",
    response_model=ProductDetailResponse,
)
async def unpublish_product(
    product_id: UUID,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductDetailResponse:
    return await catalog_service.unpublish_product(
        str(product_id), session, actor_id=actor.sub
    )


@router.post(
    "/admin/products/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_image(
    product_id: UUID,
    body: ProductImageCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductImageResponse:
    return await catalog_service.add_image(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.patch(
    "/admin/products/{product_id}/images/{image_id}",
    response_model=ProductImageResponse,
)
async def update_image(
    product_id: UUID,
    image_id: UUID,
    body: ProductImageUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductImageResponse:
    return await catalog_service.update_image(
        str(product_id), str(image_id), body, session, actor_id=actor.sub
    )


@router.delete(
    "/admin/products/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_image(
    product_id: UUID,
    image_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_image(str(product_id), str(image_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/products/{product_id}/images/reorder",
    response_model=list[ProductImageResponse],
)
async def reorder_images(
    product_id: UUID,
    body: ImageReorderRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProductImageResponse]:
    return await catalog_service.reorder_images(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.post(
    "/admin/products/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_variant(
    product_id: UUID,
    body: ProductVariantCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductVariantResponse:
    return await catalog_service.add_variant(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.patch(
    "/admin/products/{product_id}/variants/{variant_id}",
    response_model=ProductVariantResponse,
)
async def update_variant(
    product_id: UUID,
    variant_id: UUID,
    body: ProductVariantUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductVariantResponse:
    return await catalog_service.update_variant(
        str(product_id), str(variant_id), body, session, actor_id=actor.sub
    )


@router.delete(
    "/admin/products/{product_id}/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_variant(
    product_id: UUID,
    variant_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_variant(str(product_id), str(variant_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/products/{product_id}/attributes",
    response_model=ProductAttributeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_attribute(
    product_id: UUID,
    body: ProductAttributeCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductAttributeResponse:
    return await catalog_service.add_attribute(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.patch(
    "/admin/products/{product_id}/attributes/{attribute_id}",
    response_model=ProductAttributeResponse,
)
async def update_attribute(
    product_id: UUID,
    attribute_id: UUID,
    body: ProductAttributeUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductAttributeResponse:
    return await catalog_service.update_attribute(
        str(product_id), str(attribute_id), body, session, actor_id=actor.sub
    )


@router.delete(
    "/admin/products/{product_id}/attributes/{attribute_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attribute(
    product_id: UUID,
    attribute_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_attribute(str(product_id), str(attribute_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/products/{product_id}/options",
    response_model=ProductOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_option(
    product_id: UUID,
    body: ProductOptionCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductOptionResponse:
    return await catalog_service.add_option(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.patch(
    "/admin/products/{product_id}/options/{option_id}",
    response_model=ProductOptionResponse,
)
async def update_option(
    product_id: UUID,
    option_id: UUID,
    body: ProductOptionUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductOptionResponse:
    return await catalog_service.update_option(
        str(product_id), str(option_id), body, session, actor_id=actor.sub
    )


@router.delete(
    "/admin/products/{product_id}/options/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_option(
    product_id: UUID,
    option_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_option(str(product_id), str(option_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/products/{product_id}/options/{option_id}/values",
    response_model=ProductOptionValueResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_option_value(
    product_id: UUID,
    option_id: UUID,
    body: ProductOptionValueCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductOptionValueResponse:
    return await catalog_service.add_option_value(
        str(product_id), str(option_id), body, session, actor_id=actor.sub
    )


@router.patch(
    "/admin/products/{product_id}/options/{option_id}/values/{value_id}",
    response_model=ProductOptionValueResponse,
)
async def update_option_value(
    product_id: UUID,
    option_id: UUID,
    value_id: UUID,
    body: ProductOptionValueUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductOptionValueResponse:
    return await catalog_service.update_option_value(
        str(product_id),
        str(option_id),
        str(value_id),
        body,
        session,
        actor_id=actor.sub,
    )


@router.delete(
    "/admin/products/{product_id}/options/{option_id}/values/{value_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_option_value(
    product_id: UUID,
    option_id: UUID,
    value_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_option_value(
        str(product_id), str(option_id), str(value_id), session
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/admin/products/{product_id}/relations",
    response_model=list[ProductRelationResponse],
)
async def list_relations(
    product_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    relation_type: str | None = None,
) -> list[ProductRelationResponse]:
    return await catalog_service.list_relations(
        str(product_id), session, relation_type=relation_type
    )


@router.post(
    "/admin/products/{product_id}/relations",
    response_model=ProductRelationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_relation(
    product_id: UUID,
    body: ProductRelationCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductRelationResponse:
    return await catalog_service.add_relation(
        str(product_id), body, session, actor_id=actor.sub
    )


@router.delete(
    "/admin/products/{product_id}/relations/{relation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_relation(
    product_id: UUID,
    relation_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CATALOG_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await catalog_service.delete_relation(str(product_id), str(relation_id), session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
