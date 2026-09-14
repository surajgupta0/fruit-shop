"""Reorder review routes: admin before /{review_id} catch-alls."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fruitshop_shared.auth_deps import User as AuthUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.review import service as review_service
from app.modules.review.models import ReviewStatus
from app.modules.review.schemas import (
    ProductRatingSummary,
    ReviewCreate,
    ReviewEligibilityResponse,
    ReviewListResponse,
    ReviewModerateRequest,
    ReviewResponse,
    ReviewUpdate,
)
from app.modules.users.rbac import REVIEWS_MANAGE

router = APIRouter(prefix="/reviews", tags=["review"])


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="review")


# --- Public / storefront ---


@router.get("/products/{product_id}/summary", response_model=ProductRatingSummary)
async def get_product_rating_summary(
    product_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductRatingSummary:
    return await review_service.product_rating_summary(product_id, session)


@router.get("/products/{product_id}", response_model=ReviewListResponse)
async def list_reviews_for_product(
    product_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ReviewListResponse:
    """Public: approved reviews for a product."""
    return await review_service.list_product_reviews(
        product_id, session, page=page, page_size=page_size
    )


@router.get(
    "/products/{product_id}/eligibility",
    response_model=ReviewEligibilityResponse,
)
async def review_eligibility(
    product_id: UUID,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReviewEligibilityResponse:
    return await review_service.get_eligibility(
        product_id=product_id,
        user_id=user.sub,
        session=session,
    )


# --- Customer ---


@router.get("/me", response_model=ReviewListResponse)
async def list_my_reviews(
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ReviewListResponse:
    return await review_service.list_my_reviews(
        session, actor_id=user.sub, page=page, page_size=page_size
    )


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    body: ReviewCreate,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReviewResponse:
    return await review_service.create_review(body, session, actor_id=user.sub)


# --- Admin (before /{review_id}) ---


@router.get("/admin", response_model=ReviewListResponse)
async def list_reviews_admin(
    _: Annotated[AuthUser, Depends(require_permissions(REVIEWS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: ReviewStatus | None = Query(None, alias="status"),
    product_id: UUID | None = None,
    search: str | None = None,
) -> ReviewListResponse:
    return await review_service.list_reviews_admin(
        session,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        product_id=product_id,
        search=search,
    )


@router.get("/admin/{review_id}", response_model=ReviewResponse)
async def get_review_admin(
    review_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(REVIEWS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReviewResponse:
    return await review_service.get_review_admin(review_id, session)


@router.patch("/admin/{review_id}", response_model=ReviewResponse)
async def moderate_review(
    review_id: UUID,
    body: ReviewModerateRequest,
    actor: Annotated[AuthUser, Depends(require_permissions(REVIEWS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReviewResponse:
    return await review_service.moderate_review(
        review_id, body, session, actor_id=actor.sub
    )


@router.delete("/admin/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_admin(
    review_id: UUID,
    _: Annotated[AuthUser, Depends(require_permissions(REVIEWS_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await review_service.delete_review_admin(review_id, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Customer by id ---


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_my_review(
    review_id: UUID,
    body: ReviewUpdate,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReviewResponse:
    return await review_service.update_my_review(
        review_id, body, session, actor_id=user.sub
    )


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_review(
    review_id: UUID,
    user: Annotated[AuthUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await review_service.delete_my_review(review_id, session, actor_id=user.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
