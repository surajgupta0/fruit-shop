from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AuditFields(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UUID | str | None = None
    updated_by: UUID | str | None = None


class InventoryLevelResponse(BaseModel):
    variant_id: UUID | str
    product_id: UUID | str
    product_name: str
    product_slug: str
    variant_name: str
    sku: str
    track_inventory: bool
    stock_qty: int
    reserved_qty: int
    available_qty: int
    low_stock_threshold: int
    inventory_policy: str
    is_low_stock: bool
    is_out_of_stock: bool
    is_active: bool


class InventoryLevelListResponse(BaseModel):
    items: list[InventoryLevelResponse]
    total: int
    page: int
    page_size: int


class InventoryAdjustRequest(BaseModel):
    variant_id: UUID
    delta: int = Field(..., description="Signed change; positive receives, negative removes")
    reason: str = Field(min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def delta_nonzero(self) -> InventoryAdjustRequest:
        if self.delta == 0:
            raise ValueError("delta must be non-zero")
        return self


class InventorySetRequest(BaseModel):
    variant_id: UUID
    stock_qty: int = Field(..., ge=0)
    reason: str = Field(min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=2000)


class InventoryReceiveRequest(BaseModel):
    variant_id: UUID
    quantity: int = Field(..., gt=0)
    reason: str = Field(default="Stock received", max_length=255)
    note: str | None = Field(default=None, max_length=2000)


class InventoryMovementResponse(AuditFields):
    id: UUID | str
    variant_id: UUID | str
    product_id: UUID | str
    movement_type: str
    quantity_delta: int
    quantity_before: int
    quantity_after: int
    reason: str | None = None
    note: str | None = None
    reference_type: str | None = None
    reference_id: UUID | str | None = None
    idempotency_key: str | None = None
    sku: str | None = None
    variant_name: str | None = None
    product_name: str | None = None

    model_config = {"from_attributes": True}


class InventoryMovementListResponse(BaseModel):
    items: list[InventoryMovementResponse]
    total: int
    page: int
    page_size: int
