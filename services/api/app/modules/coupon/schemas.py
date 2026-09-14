from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.modules.coupon.models import DiscountType


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class CouponCreate(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    discount_type: DiscountType = DiscountType.percent
    percent_off: Decimal | None = Field(default=None, ge=0, le=100)
    amount_off: Decimal | None = Field(default=None, ge=0)
    max_discount: Decimal | None = Field(default=None, ge=0)
    min_subtotal: Decimal = Field(default=Decimal("0"), ge=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True
    usage_limit: int | None = Field(default=None, ge=1)
    per_user_limit: int | None = Field(default=None, ge=1)
    first_order_only: bool = False

    @model_validator(mode="after")
    def validate_discount_fields(self) -> CouponCreate:
        if self.discount_type == DiscountType.percent:
            if self.percent_off is None:
                raise ValueError("percent_off is required for percent coupons")
        elif self.discount_type == DiscountType.fixed:
            if self.amount_off is None:
                raise ValueError("amount_off is required for fixed coupons")
        return self


class CouponUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    discount_type: DiscountType | None = None
    percent_off: Decimal | None = Field(default=None, ge=0, le=100)
    amount_off: Decimal | None = Field(default=None, ge=0)
    max_discount: Decimal | None = Field(default=None, ge=0)
    min_subtotal: Decimal | None = Field(default=None, ge=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    per_user_limit: int | None = Field(default=None, ge=1)
    first_order_only: bool | None = None


class CouponResponse(AuditFields):
    id: UUID | str
    code: str
    name: str
    description: str | None = None
    discount_type: DiscountType | str
    percent_off: Decimal | None = None
    amount_off: Decimal | None = None
    max_discount: Decimal | None = None
    min_subtotal: Decimal
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool
    usage_limit: int | None = None
    usage_count: int
    per_user_limit: int | None = None
    first_order_only: bool

    model_config = {"from_attributes": True}


class CouponListResponse(BaseModel):
    items: list[CouponResponse]
    total: int
    page: int
    page_size: int


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=40)


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: DiscountType | str
    discount_amount: Decimal
    shipping_amount: Decimal
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    message: str | None = None


class AvailableCouponOffer(BaseModel):
    code: str
    name: str
    description: str | None = None
    discount_type: DiscountType | str
    percent_off: Decimal | None = None
    amount_off: Decimal | None = None
    max_discount: Decimal | None = None
    min_subtotal: Decimal
    first_order_only: bool
    ends_at: datetime | None = None
    applicable: bool
    reason: str | None = None
    estimated_discount: Decimal = Decimal("0")
    estimated_shipping: Decimal | None = None
    estimated_total: Decimal | None = None


class AvailableCouponListResponse(BaseModel):
    items: list[AvailableCouponOffer]
    cart_subtotal: Decimal
