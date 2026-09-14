from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.review.models import ReviewStatus


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class ReviewCreate(BaseModel):
    product_id: UUID
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=4000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    title: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=4000)


class ReviewModerateRequest(BaseModel):
    status: ReviewStatus
    admin_note: str | None = Field(default=None, max_length=500)


class ReviewResponse(AuditFields):
    id: UUID | str
    product_id: UUID | str
    user_id: UUID | str
    order_id: UUID | str | None = None
    rating: int
    title: str | None = None
    body: str | None = None
    status: ReviewStatus | str
    is_verified_purchase: bool
    admin_note: str | None = None
    author_name: str | None = None
    product_name: str | None = None
    product_slug: str | None = None

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    items: list[ReviewResponse]
    total: int
    page: int
    page_size: int


class ProductRatingSummary(BaseModel):
    product_id: UUID | str
    average_rating: Decimal
    review_count: int
    rating_breakdown: dict[int, int] = Field(
        default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    )


class ReviewEligibilityResponse(BaseModel):
    product_id: UUID | str
    can_review: bool
    reason: str | None = None
    existing_review_id: UUID | str | None = None
    order_id: UUID | str | None = None
