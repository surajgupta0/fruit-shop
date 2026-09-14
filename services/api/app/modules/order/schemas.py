from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.order.models import OrderStatus, PaymentMethod, PaymentStatus


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class CheckoutRequest(BaseModel):
    address_id: UUID
    payment_method: PaymentMethod = PaymentMethod.cod
    coupon_code: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=1000)


class CancelOrderRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class OrderItemResponse(AuditFields):
    id: UUID | str
    product_id: UUID | str | None = None
    variant_id: UUID | str | None = None
    product_name: str
    variant_name: str
    sku: str
    unit_label: str | None = None
    primary_image_url: str | None = None
    quantity: int
    unit_price: Decimal
    line_subtotal: Decimal
    tax_percent: Decimal | None = None
    tax_amount: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class OrderResponse(AuditFields):
    id: UUID | str
    order_number: str
    user_id: UUID | str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    currency: str
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    coupon_id: UUID | str | None = None
    coupon_code: str | None = None
    shipping_label: str
    shipping_line1: str
    shipping_line2: str | None = None
    shipping_city: str
    shipping_state: str
    shipping_postal_code: str
    shipping_country: str
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    notes: str | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    page_size: int


class AdminOrderUpdate(BaseModel):
    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None
