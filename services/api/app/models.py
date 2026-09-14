from app.core.database import Base
from app.modules.auth.models import OtpCode, PasswordResetToken, RefreshToken, User, UserAddress  # noqa: F401
from app.modules.cart.models import Cart, CartItem  # noqa: F401
from app.modules.catalog.models import (  # noqa: F401
    Brand,
    Category,
    Product,
    ProductAttribute,
    ProductImage,
    ProductOption,
    ProductOptionValue,
    ProductRelation,
    ProductTag,
    ProductVariant,
    Tag,
)
from app.modules.coupon.models import Coupon, CouponRedemption  # noqa: F401
from app.modules.notification.models import NotificationLog  # noqa: F401
from app.modules.order.models import Order, OrderItem  # noqa: F401
from app.modules.payment.models import Payment  # noqa: F401
from app.modules.users.models import Permission, Role, RolePermission  # noqa: F401

__all__ = [
    "Base",
    "User",
    "UserAddress",
    "OtpCode",
    "RefreshToken",
    "PasswordResetToken",
    "Role",
    "Permission",
    "RolePermission",
    "Brand",
    "Category",
    "Tag",
    "Product",
    "ProductTag",
    "ProductOption",
    "ProductOptionValue",
    "ProductAttribute",
    "ProductImage",
    "ProductVariant",
    "ProductRelation",
    "Coupon",
    "CouponRedemption",
    "NotificationLog",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
    "Payment",
]
