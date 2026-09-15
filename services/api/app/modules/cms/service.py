from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.mixins import stamp_create, stamp_update
from app.modules.cms.models import (
    BlockType,
    CmsBanner,
    CmsContentBlock,
    CmsPage,
    CmsSnippet,
    PageStatus,
)
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
    PageSummaryResponse,
    PageUpdate,
    SnippetCreate,
    SnippetListResponse,
    SnippetResponse,
    SnippetUpdate,
    _slugify,
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
    return _parse_uuid(actor_id, label="user id")


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _banner_response(row: CmsBanner) -> BannerResponse:
    return BannerResponse.model_validate(row)


def _block_response(row: CmsContentBlock) -> ContentBlockResponse:
    data = ContentBlockResponse.model_validate(row)
    data.block_type = row.block_type.value if hasattr(row.block_type, "value") else str(row.block_type)
    return data


def _page_summary(row: CmsPage) -> PageSummaryResponse:
    return PageSummaryResponse(
        id=row.id,
        slug=row.slug,
        title=row.title,
        excerpt=row.excerpt,
        status=row.status.value if hasattr(row.status, "value") else str(row.status),
        published_at=row.published_at,
        sort_order=row.sort_order,
        block_count=len(row.blocks or []),
        created_at=row.created_at,
        updated_at=row.updated_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
    )


def _page_detail(row: CmsPage, *, visible_only: bool = False) -> PageDetailResponse:
    blocks = sorted(row.blocks or [], key=lambda b: (b.sort_order, str(b.id)))
    if visible_only:
        blocks = [b for b in blocks if b.is_visible]
    return PageDetailResponse(
        id=row.id,
        slug=row.slug,
        title=row.title,
        excerpt=row.excerpt,
        meta_title=row.meta_title,
        meta_description=row.meta_description,
        status=row.status.value if hasattr(row.status, "value") else str(row.status),
        published_at=row.published_at,
        sort_order=row.sort_order,
        blocks=[_block_response(b) for b in blocks],
        created_at=row.created_at,
        updated_at=row.updated_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
    )


def _snippet_response(row: CmsSnippet) -> SnippetResponse:
    return SnippetResponse.model_validate(row)


def _banner_window_filters(now: datetime):
    return and_(
        CmsBanner.is_active.is_(True),
        or_(CmsBanner.starts_at.is_(None), CmsBanner.starts_at <= now),
        or_(CmsBanner.ends_at.is_(None), CmsBanner.ends_at >= now),
    )


# ---------- Banners ----------


async def list_banners_public(
    session: AsyncSession,
    *,
    placement: str = "home_hero",
) -> list[BannerResponse]:
    now = _utcnow()
    rows = (
        await session.execute(
            select(CmsBanner)
            .where(CmsBanner.placement == placement, _banner_window_filters(now))
            .order_by(CmsBanner.sort_order, CmsBanner.created_at.desc())
        )
    ).scalars().all()
    return [_banner_response(r) for r in rows]


async def list_banners_admin(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    placement: str | None = None,
    active_only: bool = False,
    search: str | None = None,
) -> BannerListResponse:
    filters = []
    if placement:
        filters.append(CmsBanner.placement == placement)
    if active_only:
        filters.append(CmsBanner.is_active.is_(True))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(CmsBanner.title).like(term),
                func.lower(func.coalesce(CmsBanner.label, "")).like(term),
                func.lower(CmsBanner.placement).like(term),
            )
        )

    count_q = select(func.count()).select_from(CmsBanner)
    q = select(CmsBanner)
    if filters:
        count_q = count_q.where(*filters)
        q = q.where(*filters)

    total = await session.scalar(count_q) or 0
    rows = (
        await session.execute(
            q.order_by(CmsBanner.placement, CmsBanner.sort_order, CmsBanner.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return BannerListResponse(
        items=[_banner_response(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_banner(banner_id: str | uuid.UUID, session: AsyncSession) -> BannerResponse:
    row = await session.get(CmsBanner, _parse_uuid(banner_id, label="banner id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Banner not found")
    return _banner_response(row)


async def create_banner(
    payload: BannerCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> BannerResponse:
    row = CmsBanner(**payload.model_dump())
    stamp_create(row, _actor(actor_id))
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _banner_response(row)


async def update_banner(
    banner_id: str | uuid.UUID,
    payload: BannerUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> BannerResponse:
    row = await session.get(CmsBanner, _parse_uuid(banner_id, label="banner id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Banner not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    stamp_update(row, _actor(actor_id))
    await session.commit()
    await session.refresh(row)
    return _banner_response(row)


async def delete_banner(banner_id: str | uuid.UUID, session: AsyncSession) -> None:
    row = await session.get(CmsBanner, _parse_uuid(banner_id, label="banner id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Banner not found")
    await session.delete(row)
    await session.commit()


# ---------- Pages ----------


async def _ensure_unique_page_slug(
    session: AsyncSession,
    slug: str,
    *,
    exclude_id: uuid.UUID | None = None,
) -> str:
    base = _slugify(slug) or "page"
    candidate = base
    n = 2
    while True:
        q = select(CmsPage.id).where(CmsPage.slug == candidate)
        if exclude_id is not None:
            q = q.where(CmsPage.id != exclude_id)
        exists = (await session.execute(q)).scalar_one_or_none()
        if exists is None:
            return candidate
        candidate = f"{base}-{n}"[:140]
        n += 1


async def _get_page(page_id: uuid.UUID, session: AsyncSession) -> CmsPage:
    row = (
        await session.execute(
            select(CmsPage)
            .options(selectinload(CmsPage.blocks))
            .where(CmsPage.id == page_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Page not found")
    return row


def _make_block(payload: ContentBlockCreate, page_id: uuid.UUID, actor: uuid.UUID | None) -> CmsContentBlock:
    block = CmsContentBlock(page_id=page_id, **payload.model_dump())
    stamp_create(block, actor)
    return block


async def list_pages_admin(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: PageStatus | None = None,
    search: str | None = None,
) -> PageListResponse:
    filters = []
    if status_filter is not None:
        filters.append(CmsPage.status == status_filter)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(CmsPage.title).like(term),
                func.lower(CmsPage.slug).like(term),
            )
        )

    count_q = select(func.count()).select_from(CmsPage)
    q = select(CmsPage).options(selectinload(CmsPage.blocks))
    if filters:
        count_q = count_q.where(*filters)
        q = q.where(*filters)

    total = await session.scalar(count_q) or 0
    rows = (
        await session.execute(
            q.order_by(CmsPage.sort_order, CmsPage.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().unique().all()
    return PageListResponse(
        items=[_page_summary(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_page_admin(page_id: str | uuid.UUID, session: AsyncSession) -> PageDetailResponse:
    return _page_detail(await _get_page(_parse_uuid(page_id, label="page id"), session))


async def get_page_by_slug_public(slug: str, session: AsyncSession) -> PageDetailResponse:
    row = (
        await session.execute(
            select(CmsPage)
            .options(selectinload(CmsPage.blocks))
            .where(CmsPage.slug == slug)
        )
    ).scalar_one_or_none()
    if row is None or row.status != PageStatus.published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Page not found")
    return _page_detail(row, visible_only=True)


async def create_page(
    payload: PageCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> PageDetailResponse:
    actor = _actor(actor_id)
    slug = await _ensure_unique_page_slug(session, payload.slug or payload.title)
    published_at = _as_utc(payload.published_at)
    if payload.status == PageStatus.published and published_at is None:
        published_at = _utcnow()

    page = CmsPage(
        slug=slug,
        title=payload.title.strip(),
        excerpt=payload.excerpt,
        meta_title=payload.meta_title,
        meta_description=payload.meta_description,
        status=payload.status,
        published_at=published_at,
        sort_order=payload.sort_order,
    )
    stamp_create(page, actor)
    session.add(page)
    await session.flush()

    for block_payload in payload.blocks:
        session.add(_make_block(block_payload, page.id, actor))

    await session.commit()
    return _page_detail(await _get_page(page.id, session))


async def update_page(
    page_id: str | uuid.UUID,
    payload: PageUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> PageDetailResponse:
    pid = _parse_uuid(page_id, label="page id")
    page = await _get_page(pid, session)
    data = payload.model_dump(exclude_unset=True)

    if "slug" in data and data["slug"] is not None:
        data["slug"] = await _ensure_unique_page_slug(session, data["slug"], exclude_id=pid)
    if "title" in data and data["title"] is not None:
        data["title"] = data["title"].strip()
    if "status" in data and data["status"] == PageStatus.published:
        if page.published_at is None and data.get("published_at") is None:
            data["published_at"] = _utcnow()

    for key, value in data.items():
        setattr(page, key, value)

    stamp_update(page, _actor(actor_id))
    await session.commit()
    return _page_detail(await _get_page(pid, session))


async def delete_page(page_id: str | uuid.UUID, session: AsyncSession) -> None:
    page = await _get_page(_parse_uuid(page_id, label="page id"), session)
    await session.delete(page)
    await session.commit()


async def create_block(
    page_id: str | uuid.UUID,
    payload: ContentBlockCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ContentBlockResponse:
    pid = _parse_uuid(page_id, label="page id")
    await _get_page(pid, session)
    block = _make_block(payload, pid, _actor(actor_id))
    session.add(block)
    await session.commit()
    await session.refresh(block)
    return _block_response(block)


async def update_block(
    block_id: str | uuid.UUID,
    payload: ContentBlockUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> ContentBlockResponse:
    bid = _parse_uuid(block_id, label="block id")
    block = await session.get(CmsContentBlock, bid)
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Content block not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(block, key, value)
    stamp_update(block, _actor(actor_id))
    await session.commit()
    await session.refresh(block)
    return _block_response(block)


async def delete_block(block_id: str | uuid.UUID, session: AsyncSession) -> None:
    block = await session.get(CmsContentBlock, _parse_uuid(block_id, label="block id"))
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Content block not found")
    await session.delete(block)
    await session.commit()


async def reorder_blocks(
    page_id: str | uuid.UUID,
    payload: ContentBlockReorderRequest,
    session: AsyncSession,
    *,
    actor_id: str,
) -> PageDetailResponse:
    pid = _parse_uuid(page_id, label="page id")
    page = await _get_page(pid, session)
    by_id = {b.id: b for b in page.blocks}
    actor = _actor(actor_id)
    for item in payload.blocks:
        block = by_id.get(item.id)
        if block is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Block {item.id} does not belong to this page",
            )
        block.sort_order = item.sort_order
        stamp_update(block, actor)
    stamp_update(page, actor)
    await session.commit()
    session.expire_all()
    return _page_detail(await _get_page(pid, session))


# ---------- Snippets ----------


async def list_snippets_public(
    session: AsyncSession,
    *,
    keys: list[str] | None = None,
) -> list[SnippetResponse]:
    q = select(CmsSnippet).where(CmsSnippet.is_active.is_(True))
    if keys:
        normalized = [k.strip().lower() for k in keys if k.strip()]
        if normalized:
            q = q.where(CmsSnippet.key.in_(normalized))
    rows = (await session.execute(q.order_by(CmsSnippet.key))).scalars().all()
    return [_snippet_response(r) for r in rows]


async def get_snippet_by_key_public(key: str, session: AsyncSession) -> SnippetResponse:
    row = (
        await session.execute(
            select(CmsSnippet).where(
                CmsSnippet.key == key.strip().lower(),
                CmsSnippet.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    return _snippet_response(row)


async def list_snippets_admin(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    active_only: bool = False,
    search: str | None = None,
) -> SnippetListResponse:
    filters = []
    if active_only:
        filters.append(CmsSnippet.is_active.is_(True))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(CmsSnippet.key).like(term),
                func.lower(CmsSnippet.title).like(term),
            )
        )
    count_q = select(func.count()).select_from(CmsSnippet)
    q = select(CmsSnippet)
    if filters:
        count_q = count_q.where(*filters)
        q = q.where(*filters)
    total = await session.scalar(count_q) or 0
    rows = (
        await session.execute(
            q.order_by(CmsSnippet.key)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return SnippetListResponse(
        items=[_snippet_response(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_snippet(snippet_id: str | uuid.UUID, session: AsyncSession) -> SnippetResponse:
    row = await session.get(CmsSnippet, _parse_uuid(snippet_id, label="snippet id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    return _snippet_response(row)


async def create_snippet(
    payload: SnippetCreate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> SnippetResponse:
    exists = (
        await session.execute(select(CmsSnippet.id).where(CmsSnippet.key == payload.key))
    ).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Snippet key already exists")
    row = CmsSnippet(**payload.model_dump())
    stamp_create(row, _actor(actor_id))
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _snippet_response(row)


async def update_snippet(
    snippet_id: str | uuid.UUID,
    payload: SnippetUpdate,
    session: AsyncSession,
    *,
    actor_id: str,
) -> SnippetResponse:
    row = await session.get(CmsSnippet, _parse_uuid(snippet_id, label="snippet id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    stamp_update(row, _actor(actor_id))
    await session.commit()
    await session.refresh(row)
    return _snippet_response(row)


async def delete_snippet(snippet_id: str | uuid.UUID, session: AsyncSession) -> None:
    row = await session.get(CmsSnippet, _parse_uuid(snippet_id, label="snippet id"))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    await session.delete(row)
    await session.commit()


# Re-export BlockType for router filters if needed
__all__ = [
    "BlockType",
    "list_banners_public",
    "list_banners_admin",
    "get_banner",
    "create_banner",
    "update_banner",
    "delete_banner",
    "list_pages_admin",
    "get_page_admin",
    "get_page_by_slug_public",
    "create_page",
    "update_page",
    "delete_page",
    "create_block",
    "update_block",
    "delete_block",
    "reorder_blocks",
    "list_snippets_public",
    "get_snippet_by_key_public",
    "list_snippets_admin",
    "get_snippet",
    "create_snippet",
    "update_snippet",
    "delete_snippet",
]
