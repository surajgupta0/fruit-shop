from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class CartItemAdd(BaseModel):
    variant_id: UUID
    quantity: int = Field(ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=999)


class CartItemResponse(AuditFields):
    id: UUID | str
    variant_id: UUID | str
    quantity: int
    product_id: UUID | str | None = None
    product_name: str | None = None
    product_slug: str | None = None
    variant_name: str | None = None
    sku: str | None = None
    unit_price: Decimal | None = None
    line_subtotal: Decimal | None = None
    primary_image_url: str | None = None
    unit_label: str | None = None
    in_stock: bool = True
    stock_qty: int | None = None

    model_config = {"from_attributes": True}


class CartResponse(AuditFields):
    id: UUID | str
    user_id: UUID | str
    items: list[CartItemResponse]
    item_count: int
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    total: Decimal
    currency: str = "INR"

    model_config = {"from_attributes": True}
