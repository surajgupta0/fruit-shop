from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import AuditMixin


class InventoryMovementType(str, enum.Enum):
    sale = "sale"
    sale_restore = "sale_restore"
    adjustment = "adjustment"
    receive = "receive"
    set = "set"


class InventoryReferenceType(str, enum.Enum):
    order = "order"
    catalog = "catalog"
    manual = "manual"


class InventoryMovement(AuditMixin, Base):
    """Immutable stock ledger. Variant `stock_qty` is the live on-hand mirror."""

    __tablename__ = "inventory_movements"
    __table_args__ = (
        UniqueConstraint(
            "idempotency_key",
            name="uq_inventory_movements_idempotency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    movement_type: Mapped[InventoryMovementType] = mapped_column(
        Enum(
            InventoryMovementType,
            name="inventory_movement_type",
            native_enum=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=False,
        index=True,
    )
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_before: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_type: Mapped[InventoryReferenceType | None] = mapped_column(
        Enum(
            InventoryReferenceType,
            name="inventory_reference_type",
            native_enum=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=True,
        index=True,
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    # sale:{order_id}:{variant_id} | sale_restore:... — prevents double deduct/restore
    idempotency_key: Mapped[str | None] = mapped_column(String(160), nullable=True)
