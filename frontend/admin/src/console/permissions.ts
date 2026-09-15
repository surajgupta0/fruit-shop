/** Permission codes — keep in sync with services/api/.../rbac.py */

export const P = {
  USERS_READ_SELF: "users:read_self",
  USERS_UPDATE_SELF: "users:update_self",
  USERS_LIST: "users:list",
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_CHANGE_ROLE: "users:change_role",
  USERS_DEACTIVATE: "users:deactivate",
  ROLES_LIST: "roles:list",
  ROLES_MANAGE: "roles:manage",
  CATALOG_MANAGE: "catalog:manage",
  INVENTORY_MANAGE: "inventory:manage",
  ORDERS_MANAGE: "orders:manage",
  ORDERS_READ: "orders:read",
  COUPONS_MANAGE: "coupons:manage",
  NOTIFICATIONS_READ: "notifications:read",
  REVIEWS_MANAGE: "reviews:manage",
  CMS_MANAGE: "cms:manage",
} as const;

export type PermissionCode = (typeof P)[keyof typeof P];
