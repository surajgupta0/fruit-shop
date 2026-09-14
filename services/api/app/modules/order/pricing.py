from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status

from app.modules.catalog.models import InventoryPolicy, Product, ProductStatus, ProductVariant
from app.modules.inventory.service import available_qty


FREE_SHIPPING_THRESHOLD = Decimal("999")
SHIPPING_FEE = Decimal("99")
CURRENCY = "INR"


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class PricedLine:
    unit_price: Decimal
    quantity: int
    line_subtotal: Decimal
    tax_percent: Decimal | None
    tax_amount: Decimal
    line_total: Decimal


def validate_quantity(product: Product, quantity: int) -> None:
    if quantity < product.min_order_qty:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order quantity for {product.name} is {product.min_order_qty}",
        )
    if product.max_order_qty is not None and quantity > product.max_order_qty:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum order quantity for {product.name} is {product.max_order_qty}",
        )
    increment = product.order_qty_increment or 1
    if increment > 1 and quantity % increment != 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Quantity for {product.name} must be in increments of {increment}",
        )


def check_stock(product: Product, variant: ProductVariant, quantity: int) -> bool:
    if not product.track_inventory:
        return True
    if variant.inventory_policy == InventoryPolicy.continue_:
        return True
    return available_qty(variant) >= quantity


def assert_purchasable(product: Product, variant: ProductVariant, quantity: int) -> None:
    if product.status != ProductStatus.active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Product is not available")
    if not variant.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Variant is not available")
    validate_quantity(product, quantity)
    if not check_stock(product, variant, quantity):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Only {available_qty(variant)} left in stock for {variant.name}",
        )


def price_line(product: Product, variant: ProductVariant, quantity: int) -> PricedLine:
    unit_price = _money(Decimal(str(variant.price)))
    line_subtotal = _money(unit_price * quantity)
    tax_percent: Decimal | None = None
    tax_amount = Decimal("0")
    if product.is_taxable and product.tax_percent is not None:
        tax_percent = _money(Decimal(str(product.tax_percent)))
        tax_amount = _money(line_subtotal * tax_percent / Decimal("100"))
    line_total = _money(line_subtotal + tax_amount)
    return PricedLine(
        unit_price=unit_price,
        quantity=quantity,
        line_subtotal=line_subtotal,
        tax_percent=tax_percent,
        tax_amount=tax_amount,
        line_total=line_total,
    )


def shipping_amount(subtotal: Decimal) -> Decimal:
    if subtotal >= FREE_SHIPPING_THRESHOLD:
        return Decimal("0")
    return SHIPPING_FEE


def cart_totals(
    lines: list[PricedLine],
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    subtotal = _money(sum((line.line_subtotal for line in lines), Decimal("0")))
    tax_amount = _money(sum((line.tax_amount for line in lines), Decimal("0")))
    shipping = shipping_amount(subtotal)
    total = _money(subtotal + tax_amount + shipping)
    return subtotal, tax_amount, shipping, total
