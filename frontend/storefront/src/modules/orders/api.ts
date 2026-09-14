import { api } from "@fruitshop/web-core";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cod" | "online";

export type CartItem = {
  id: string;
  variant_id: string;
  quantity: number;
  product_id: string | null;
  product_name: string | null;
  product_slug: string | null;
  variant_name: string | null;
  sku: string | null;
  unit_price: string | number | null;
  line_subtotal: string | number | null;
  primary_image_url: string | null;
  unit_label: string | null;
  in_stock: boolean;
  stock_qty: number | null;
};

export type Cart = {
  id: string;
  user_id: string;
  items: CartItem[];
  item_count: number;
  subtotal: string | number;
  tax_amount: string | number;
  shipping_amount: string | number;
  total: string | number;
  currency: string;
};

export type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  unit_label: string | null;
  primary_image_url: string | null;
  quantity: number;
  unit_price: string | number;
  line_subtotal: string | number;
  tax_amount: string | number;
  line_total: string | number;
};

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  currency: string;
  subtotal: string | number;
  tax_amount: string | number;
  shipping_amount: string | number;
  discount_amount: string | number;
  total: string | number;
  shipping_label: string;
  shipping_line1: string;
  shipping_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

export type OrderListResponse = {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
};

export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export function formatMoney(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatAddress(a: Pick<Address, "line1" | "line2" | "city" | "state" | "postal_code" | "country">) {
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.postal_code}`, a.country]
    .filter(Boolean)
    .join("\n");
}

export function orderStatusLabel(status: OrderStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export const cartApi = {
  get() {
    return api.get<Cart>("/cart", { auth: true, toastOnError: false });
  },
  addItem(variant_id: string, quantity: number) {
    return api.post<Cart>(
      "/cart/items",
      { variant_id, quantity },
      { auth: true, successToast: "Added to cart" },
    );
  },
  updateItem(item_id: string, quantity: number) {
    return api.patch<Cart>(
      `/cart/items/${item_id}`,
      { quantity },
      { auth: true },
    );
  },
  removeItem(item_id: string) {
    return api.delete<Cart>(`/cart/items/${item_id}`, { auth: true });
  },
  clear() {
    return api.delete<Cart>("/cart", { auth: true });
  },
};

export const ordersApi = {
  checkout(body: { address_id: string; payment_method: PaymentMethod; notes?: string }) {
    return api.post<Order>("/orders/checkout", body, {
      auth: true,
      successToast: "Order placed!",
    });
  },
  list(params?: { page?: number; page_size?: number }) {
    return api.get<OrderListResponse>("/orders", { params, auth: true });
  },
  get(id: string) {
    return api.get<Order>(`/orders/${id}`, { auth: true });
  },
  cancel(id: string, reason?: string) {
    return api.post<Order>(`/orders/${id}/cancel`, { reason }, { auth: true, successToast: "Order cancelled" });
  },
  confirmPayment(orderId: string, provider_reference?: string) {
    return api.post(`/payments/order/${orderId}/confirm`, { provider_reference }, { auth: true });
  },
};

export const addressApi = {
  list() {
    return api.get<Address[]>("/users/me/addresses", { auth: true });
  },
  create(body: {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
    is_default?: boolean;
  }) {
    return api.post<Address>("/users/me/addresses", body, {
      auth: true,
      successToast: "Address saved",
    });
  },
  update(
    id: string,
    body: Partial<{
      label: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
      is_default: boolean;
    }>,
  ) {
    return api.patch<Address>(`/users/me/addresses/${id}`, body, {
      auth: true,
      successToast: "Address updated",
    });
  },
  delete(id: string) {
    return api.delete<void>(`/users/me/addresses/${id}`, {
      auth: true,
      successToast: "Address removed",
    });
  },
};
