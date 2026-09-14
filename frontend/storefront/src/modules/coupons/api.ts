import { api } from "@fruitshop/web-core";

export type CouponValidateResponse = {
  valid: boolean;
  code: string;
  discount_type: string;
  discount_amount: string | number;
  shipping_amount: string | number;
  subtotal: string | number;
  tax_amount: string | number;
  total: string | number;
  message: string | null;
};

export type AvailableCouponOffer = {
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  percent_off: string | number | null;
  amount_off: string | number | null;
  max_discount: string | number | null;
  min_subtotal: string | number;
  first_order_only: boolean;
  ends_at: string | null;
  applicable: boolean;
  reason: string | null;
  estimated_discount: string | number;
  estimated_shipping: string | number | null;
  estimated_total: string | number | null;
};

export type AvailableCouponListResponse = {
  items: AvailableCouponOffer[];
  cart_subtotal: string | number;
};

export function couponOfferLabel(offer: AvailableCouponOffer): string {
  if (offer.discount_type === "percent" && offer.percent_off != null) {
    return `${offer.percent_off}% off`;
  }
  if (offer.discount_type === "fixed" && offer.amount_off != null) {
    return `₹${offer.amount_off} off`;
  }
  if (offer.discount_type === "free_shipping") {
    return "Free shipping";
  }
  return "Offer";
}

export const couponsApi = {
  listAvailable() {
    return api.get<AvailableCouponListResponse>("/coupons/available", { auth: true });
  },

  validate(code: string) {
    return api.post<CouponValidateResponse>(
      "/coupons/validate",
      { code: code.trim() },
      { auth: true, toastOnError: true },
    );
  },
};
