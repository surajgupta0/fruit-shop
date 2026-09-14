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

export type OrderItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  sku: string;
  unit_label: string | null;
  primary_image_url: string | null;
  quantity: number;
  unit_price: string | number;
  line_subtotal: string | number;
  tax_percent: string | number | null;
  tax_amount: string | number;
  line_total: string | number;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
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

export type Payment = {
  id: string;
  order_id: string;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOrderUpdate = {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
};

function money(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const formatMoney = money;

export function formatAddress(order: Order) {
  const lines = [
    order.shipping_line1,
    order.shipping_line2,
    `${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}`,
    order.shipping_country,
  ].filter(Boolean);
  return lines.join("\n");
}

export function orderStatusTone(status: OrderStatus): "ok" | "warn" | "neutral" | "danger" {
  switch (status) {
    case "delivered":
      return "ok";
    case "confirmed":
    case "processing":
    case "shipped":
      return "neutral";
    case "pending":
      return "warn";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function paymentStatusTone(status: PaymentStatus): "ok" | "warn" | "neutral" | "danger" {
  switch (status) {
    case "paid":
      return "ok";
    case "pending":
      return "warn";
    case "failed":
    case "refunded":
      return "danger";
    default:
      return "neutral";
  }
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const ordersApi = {
  list(params?: { page?: number; page_size?: number; status?: OrderStatus }) {
    return api.get<OrderListResponse>("/orders/admin/list", { params, auth: true });
  },

  get(id: string) {
    return api.get<Order>(`/orders/admin/${id}`, { auth: true });
  },

  update(id: string, body: AdminOrderUpdate) {
    return api.patch<Order>(`/orders/admin/${id}`, body, {
      auth: true,
      successToast: "Order updated",
    });
  },

  getPayment(orderId: string) {
    return api.get<Payment>(`/payments/order/${orderId}`, { auth: true });
  },

  refund(orderId: string, reason?: string) {
    return api.post<Payment>(
      `/payments/order/${orderId}/refund`,
      { reason: reason || undefined },
      { auth: true, successToast: "Payment refunded" },
    );
  },
};
