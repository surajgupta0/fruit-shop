from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.mixins import AuditMixin


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class PaymentMethod(str, enum.Enum):
    cod = "cod"
    online = "online"


class Order(AuditMixin, Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
    )

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", native_enum=False),
        default=OrderStatus.pending,
        index=True,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", native_enum=False),
        default=PaymentStatus.pending,
        index=True,
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", native_enum=False),
        default=PaymentMethod.cod,
    )

    currency: Mapped[str] = mapped_column(String(3), default="INR")

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    shipping_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Shipping address snapshot
    shipping_label: Mapped[str] = mapped_column(String(64), default="home")
    shipping_line1: Mapped[str] = mapped_column(String(255))
    shipping_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_city: Mapped[str] = mapped_column(String(100))
    shipping_state: Mapped[str] = mapped_column(String(100))
    shipping_postal_code: Mapped[str] = mapped_column(String(20))
    shipping_country: Mapped[str] = mapped_column(String(2), default="IN")

    customer_name: Mapped[str] = mapped_column(String(255))
    customer_phone: Mapped[str] = mapped_column(String(32))
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class OrderItem(AuditMixin, Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    product_name: Mapped[str] = mapped_column(String(200))
    variant_name: Mapped[str] = mapped_column(String(120))
    sku: Mapped[str] = mapped_column(String(64))
    unit_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    primary_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped[Order] = relationship(back_populates="items", foreign_keys=[order_id])
