from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.order.models import PaymentMethod, PaymentStatus


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class PaymentResponse(AuditFields):
    id: UUID | str
    order_id: UUID | str
    amount: Decimal
    currency: str
    status: PaymentStatus
    method: PaymentMethod
    provider: str | None = None
    provider_reference: str | None = None
    failure_reason: str | None = None
    paid_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentConfirmRequest(BaseModel):
    provider_reference: str | None = Field(default=None, max_length=255)


class PaymentRefundRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
