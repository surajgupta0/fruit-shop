from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.cart import service as cart_service
from app.modules.coupon import service as coupon_service
from app.modules.coupon.schemas import (
    CouponCreate,
    CouponListResponse,
    CouponResponse,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.modules.order.helpers import load_variant_bundle
from app.modules.order.pricing import price_line
from app.modules.users.rbac import COUPONS_MANAGE

router = APIRouter(prefix="/coupons", tags=["coupon"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="coupon")


@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    body: CouponValidateRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CouponValidateResponse:
    cart = await cart_service.get_cart_model(user.sub, session)
    lines = []
    for item in cart.items:
        variant, product = await load_variant_bundle(item.variant_id, session)
        lines.append(price_line(product, variant, item.quantity))
    return await coupon_service.validate_for_user_cart(
        code=body.code,
        user_id=user.sub,
        lines=lines,
        session=session,
    )


@router.get("/admin", response_model=CouponListResponse)
async def list_coupons_admin(
    _: Annotated[AuthUser, Depends(require_permissions(COUPONS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    search: str | None = None,
) -> CouponListResponse:
    return await coupon_service.list_coupons(
        session,
        page=page,
        page_size=page_size,
        active_only=active_only,
        search=search,
    )


@router.post("/admin", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    body: CouponCreate,
    actor: Annotated[AuthUser, Depends(require_permissions(COUPONS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CouponResponse:
    return await coupon_service.create_coupon(body, session, actor_id=actor.sub)


@router.get("/admin/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: str,
    _: Annotated[AuthUser, Depends(require_permissions(COUPONS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CouponResponse:
    return await coupon_service.get_coupon(coupon_id, session)


@router.patch("/admin/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    body: CouponUpdate,
    actor: Annotated[AuthUser, Depends(require_permissions(COUPONS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CouponResponse:
    return await coupon_service.update_coupon(
        coupon_id, body, session, actor_id=actor.sub
    )


@router.delete("/admin/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: str,
    _: Annotated[AuthUser, Depends(require_permissions(COUPONS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await coupon_service.delete_coupon(coupon_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
