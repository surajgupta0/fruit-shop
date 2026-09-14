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

export const couponsApi = {
  validate(code: string) {
    return api.post<CouponValidateResponse>(
      "/coupons/validate",
      { code: code.trim() },
      { auth: true, toastOnError: true },
    );
  },
};
