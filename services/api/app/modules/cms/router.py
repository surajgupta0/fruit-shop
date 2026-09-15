from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.cms import service as cms_service
from app.modules.cms.models import PageStatus
from app.modules.cms.schemas import (
    BannerCreate,
    BannerListResponse,
    BannerResponse,
    BannerUpdate,
    ContentBlockCreate,
    ContentBlockReorderRequest,
    ContentBlockResponse,
    ContentBlockUpdate,
    PageCreate,
    PageDetailResponse,
    PageListResponse,
    PageUpdate,
    SnippetCreate,
    SnippetListResponse,
    SnippetResponse,
    SnippetUpdate,
)
from app.modules.users.rbac import CMS_MANAGE

router = APIRouter(prefix="/cms", tags=["cms"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="cms")


# ---------- Public ----------


@router.get("/banners", response_model=list[BannerResponse])
async def list_public_banners(
    session: Annotated[AsyncSession, Depends(get_session)],
    placement: str = Query("home_hero", min_length=1, max_length=64),
) -> list[BannerResponse]:
    """Active banners for a placement (date window applied)."""
    return await cms_service.list_banners_public(session, placement=placement)


@router.get("/pages/by-slug/{slug}", response_model=PageDetailResponse)
async def get_public_page(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PageDetailResponse:
    return await cms_service.get_page_by_slug_public(slug, session)


@router.get("/snippets", response_model=list[SnippetResponse])
async def list_public_snippets(
    session: Annotated[AsyncSession, Depends(get_session)],
    keys: str | None = Query(
        None,
        description="Comma-separated snippet keys (optional filter)",
    ),
) -> list[SnippetResponse]:
    key_list = [k.strip() for k in keys.split(",")] if keys else None
    return await cms_service.list_snippets_public(session, keys=key_list)


@router.get("/snippets/by-key/{key}", response_model=SnippetResponse)
async def get_public_snippet(
    key: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SnippetResponse:
    return await cms_service.get_snippet_by_key_public(key, session)


# ---------- Admin: banners ----------


@router.get("/admin/banners", response_model=BannerListResponse)
async def list_banners_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    placement: str | None = None,
    active_only: bool = False,
    search: str | None = None,
) -> BannerListResponse:
    return await cms_service.list_banners_admin(
        session,
        page=page,
        page_size=page_size,
        placement=placement,
        active_only=active_only,
        search=search,
    )


@router.post(
    "/admin/banners",
    response_model=BannerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_banner(
    body: BannerCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BannerResponse:
    return await cms_service.create_banner(body, session, actor_id=actor.sub)


@router.get("/admin/banners/{banner_id}", response_model=BannerResponse)
async def get_banner(
    banner_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BannerResponse:
    return await cms_service.get_banner(banner_id, session)


@router.patch("/admin/banners/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: UUID,
    body: BannerUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BannerResponse:
    return await cms_service.update_banner(
        banner_id, body, session, actor_id=actor.sub
    )


@router.delete("/admin/banners/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await cms_service.delete_banner(banner_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Admin: pages ----------


@router.get("/admin/pages", response_model=PageListResponse)
async def list_pages_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: PageStatus | None = Query(None, alias="status"),
    search: str | None = None,
) -> PageListResponse:
    return await cms_service.list_pages_admin(
        session,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        search=search,
    )


@router.post(
    "/admin/pages",
    response_model=PageDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_page(
    body: PageCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PageDetailResponse:
    return await cms_service.create_page(body, session, actor_id=actor.sub)


@router.get("/admin/pages/{page_id}", response_model=PageDetailResponse)
async def get_page_admin(
    page_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PageDetailResponse:
    return await cms_service.get_page_admin(page_id, session)


@router.patch("/admin/pages/{page_id}", response_model=PageDetailResponse)
async def update_page(
    page_id: UUID,
    body: PageUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PageDetailResponse:
    return await cms_service.update_page(page_id, body, session, actor_id=actor.sub)


@router.delete("/admin/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    page_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await cms_service.delete_page(page_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/pages/{page_id}/blocks",
    response_model=ContentBlockResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_block(
    page_id: UUID,
    body: ContentBlockCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ContentBlockResponse:
    return await cms_service.create_block(
        page_id, body, session, actor_id=actor.sub
    )


@router.put(
    "/admin/pages/{page_id}/blocks/reorder",
    response_model=PageDetailResponse,
)
async def reorder_blocks(
    page_id: UUID,
    body: ContentBlockReorderRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PageDetailResponse:
    return await cms_service.reorder_blocks(
        page_id, body, session, actor_id=actor.sub
    )


@router.patch("/admin/blocks/{block_id}", response_model=ContentBlockResponse)
async def update_block(
    block_id: UUID,
    body: ContentBlockUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ContentBlockResponse:
    return await cms_service.update_block(
        block_id, body, session, actor_id=actor.sub
    )


@router.delete("/admin/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await cms_service.delete_block(block_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Admin: snippets ----------


@router.get("/admin/snippets", response_model=SnippetListResponse)
async def list_snippets_admin(
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    active_only: bool = False,
    search: str | None = None,
) -> SnippetListResponse:
    return await cms_service.list_snippets_admin(
        session,
        page=page,
        page_size=page_size,
        active_only=active_only,
        search=search,
    )


@router.post(
    "/admin/snippets",
    response_model=SnippetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_snippet(
    body: SnippetCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SnippetResponse:
    return await cms_service.create_snippet(body, session, actor_id=actor.sub)


@router.get("/admin/snippets/{snippet_id}", response_model=SnippetResponse)
async def get_snippet(
    snippet_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SnippetResponse:
    return await cms_service.get_snippet(snippet_id, session)


@router.patch("/admin/snippets/{snippet_id}", response_model=SnippetResponse)
async def update_snippet(
    snippet_id: UUID,
    body: SnippetUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SnippetResponse:
    return await cms_service.update_snippet(
        snippet_id, body, session, actor_id=actor.sub
    )


@router.delete("/admin/snippets/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_snippet(
    snippet_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(CMS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await cms_service.delete_snippet(snippet_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
