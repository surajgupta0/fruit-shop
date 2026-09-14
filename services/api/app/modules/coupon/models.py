from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.mixins import AuditMixin


class DiscountType(str, enum.Enum):
    percent = "percent"
    fixed = "fixed"
    free_shipping = "free_shipping"


class Coupon(AuditMixin, Base):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="discount_type", native_enum=False),
        default=DiscountType.percent,
    )
    percent_off: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    amount_off: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    max_discount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    min_subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    per_user_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_order_only: Mapped[bool] = mapped_column(Boolean, default=False)

    redemptions: Mapped[list[CouponRedemption]] = relationship(
        back_populates="coupon",
        cascade="all, delete-orphan",
    )


class CouponRedemption(AuditMixin, Base):
    __tablename__ = "coupon_redemptions"
    __table_args__ = (
        UniqueConstraint("order_id", name="uq_coupon_redemption_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    coupon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coupons.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        index=True,
    )
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    code_snapshot: Mapped[str] = mapped_column(String(40))

    coupon: Mapped[Coupon] = relationship(back_populates="redemptions")
