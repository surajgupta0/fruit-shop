import { api } from "@fruitshop/web-core";

export type DiscountType = "percent" | "fixed" | "free_shipping";

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: DiscountType | string;
  percent_off: string | number | null;
  amount_off: string | number | null;
  max_discount: string | number | null;
  min_subtotal: string | number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  first_order_only: boolean;
};

export type CouponListResponse = {
  items: Coupon[];
  total: number;
  page: number;
  page_size: number;
};

export type CouponCreateInput = {
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  percent_off?: number | null;
  amount_off?: number | null;
  max_discount?: number | null;
  min_subtotal?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  first_order_only?: boolean;
};

export const couponsApi = {
  list(params?: {
    page?: number;
    page_size?: number;
    active_only?: boolean;
    search?: string;
  }) {
    return api.get<CouponListResponse>("/coupons/admin", { params });
  },

  get(id: string) {
    return api.get<Coupon>(`/coupons/admin/${id}`);
  },

  create(body: CouponCreateInput) {
    return api.post<Coupon>("/coupons/admin", body, { successToast: "Coupon created" });
  },

  update(id: string, body: Record<string, unknown>) {
    return api.patch<Coupon>(`/coupons/admin/${id}`, body, {
      successToast: "Coupon updated",
    });
  },

  delete(id: string) {
    return api.delete<void>(`/coupons/admin/${id}`, { successToast: "Coupon deleted" });
  },
};
