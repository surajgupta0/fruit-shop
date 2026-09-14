from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.inventory import service as inventory_service
from app.modules.inventory.schemas import (
    InventoryAdjustRequest,
    InventoryLevelListResponse,
    InventoryLevelResponse,
    InventoryMovementListResponse,
    InventoryReceiveRequest,
    InventorySetRequest,
)
from app.modules.users.rbac import INVENTORY_MANAGE

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="inventory")


@router.get("/admin/levels", response_model=InventoryLevelListResponse)
async def list_inventory_levels(
    _: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    product_id: UUID | None = None,
    low_stock_only: bool = False,
    out_of_stock_only: bool = False,
    active_only: bool = True,
) -> InventoryLevelListResponse:
    return await inventory_service.list_levels(
        session,
        page=page,
        page_size=page_size,
        search=search,
        product_id=product_id,
        low_stock_only=low_stock_only,
        out_of_stock_only=out_of_stock_only,
        active_only=active_only,
    )


@router.get("/admin/levels/{variant_id}", response_model=InventoryLevelResponse)
async def get_inventory_level(
    variant_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InventoryLevelResponse:
    return await inventory_service.get_level(variant_id, session)


@router.get("/admin/low-stock", response_model=InventoryLevelListResponse)
async def list_low_stock(
    _: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> InventoryLevelListResponse:
    return await inventory_service.list_levels(
        session,
        page=page,
        page_size=page_size,
        low_stock_only=True,
        active_only=True,
    )


@router.get("/admin/movements", response_model=InventoryMovementListResponse)
async def list_inventory_movements(
    _: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    variant_id: UUID | None = None,
    product_id: UUID | None = None,
    movement_type: str | None = None,
    reference_id: UUID | None = None,
) -> InventoryMovementListResponse:
    return await inventory_service.list_movements(
        session,
        page=page,
        page_size=page_size,
        variant_id=variant_id,
        product_id=product_id,
        movement_type=movement_type,
        reference_id=reference_id,
    )


@router.post("/admin/adjust", response_model=InventoryLevelResponse)
async def adjust_inventory(
    body: InventoryAdjustRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InventoryLevelResponse:
    return await inventory_service.adjust_stock(body, session, actor_id=actor.sub)


@router.post("/admin/receive", response_model=InventoryLevelResponse)
async def receive_inventory(
    body: InventoryReceiveRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InventoryLevelResponse:
    return await inventory_service.receive_stock(body, session, actor_id=actor.sub)


@router.post("/admin/set", response_model=InventoryLevelResponse)
async def set_inventory(
    body: InventorySetRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(INVENTORY_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InventoryLevelResponse:
    return await inventory_service.set_stock(body, session, actor_id=actor.sub)
