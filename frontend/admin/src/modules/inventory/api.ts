import { api } from "@fruitshop/web-core";

export type InventoryLevel = {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_name: string;
  sku: string;
  track_inventory: boolean;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  low_stock_threshold: number;
  inventory_policy: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
};

export type InventoryLevelListResponse = {
  items: InventoryLevel[];
  total: number;
  page: number;
  page_size: number;
};

export type InventoryMovement = {
  id: string;
  variant_id: string;
  product_id: string;
  movement_type: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  sku: string | null;
  variant_name: string | null;
  product_name: string | null;
  created_at?: string | null;
};

export type InventoryMovementListResponse = {
  items: InventoryMovement[];
  total: number;
  page: number;
  page_size: number;
};

export type InventoryLevelsParams = {
  page?: number;
  page_size?: number;
  search?: string;
  product_id?: string;
  low_stock_only?: boolean;
  out_of_stock_only?: boolean;
  active_only?: boolean;
};

export const inventoryApi = {
  listLevels(params?: InventoryLevelsParams) {
    return api.get<InventoryLevelListResponse>("/inventory/admin/levels", { params });
  },

  getLevel(variantId: string) {
    return api.get<InventoryLevel>(`/inventory/admin/levels/${variantId}`);
  },

  listLowStock(params?: { page?: number; page_size?: number }) {
    return api.get<InventoryLevelListResponse>("/inventory/admin/low-stock", { params });
  },

  listMovements(params?: {
    page?: number;
    page_size?: number;
    variant_id?: string;
    product_id?: string;
    movement_type?: string;
    reference_id?: string;
  }) {
    return api.get<InventoryMovementListResponse>("/inventory/admin/movements", { params });
  },

  adjust(body: { variant_id: string; delta: number; reason: string; note?: string }) {
    return api.post<InventoryLevel>("/inventory/admin/adjust", body, {
      successToast: "Stock adjusted",
    });
  },

  receive(body: { variant_id: string; quantity: number; reason?: string; note?: string }) {
    return api.post<InventoryLevel>("/inventory/admin/receive", body, {
      successToast: "Stock received",
    });
  },

  set(body: { variant_id: string; stock_qty: number; reason: string; note?: string }) {
    return api.post<InventoryLevel>("/inventory/admin/set", body, {
      successToast: "Stock updated",
    });
  },
};
