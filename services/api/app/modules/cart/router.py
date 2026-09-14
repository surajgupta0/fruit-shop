from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_session
from app.modules.cart import service as cart_service
from app.modules.cart.schemas import CartItemAdd, CartItemUpdate, CartResponse

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_my_cart(
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CartResponse:
    return await cart_service.get_cart(user.sub, session)


@router.post("/items", response_model=CartResponse)
async def add_cart_item(
    body: CartItemAdd,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CartResponse:
    return await cart_service.add_or_update_item(
        user.sub,
        body.variant_id,
        body.quantity,
        session,
        actor_id=user.sub,
    )


@router.patch("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: UUID,
    body: CartItemUpdate,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CartResponse:
    return await cart_service.update_item_quantity(
        user.sub,
        item_id,
        body.quantity,
        session,
        actor_id=user.sub,
    )


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: UUID,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CartResponse:
    return await cart_service.remove_item(user.sub, item_id, session)


@router.delete("", response_model=CartResponse)
async def clear_my_cart(
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CartResponse:
    return await cart_service.clear_cart(user.sub, session)
