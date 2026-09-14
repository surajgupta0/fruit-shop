/**
 * Single source for console sidebar links.
 * Add a route + entry here when a new panel ships.
 */
import { P, type PermissionCode } from "./permissions";

export type NavItem = {
  href: string;
  label: string;
  /** null = visible to any signed-in staff */
  permission: PermissionCode | null;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    permission: null,
    description: "Dashboard and shortcuts",
  },
  {
    href: "/products",
    label: "Products",
    permission: P.CATALOG_MANAGE,
    description: "Catalog SKUs and listings",
  },
  {
    href: "/inventory",
    label: "Inventory",
    permission: P.CATALOG_MANAGE,
    description: "Stock levels and low-stock alerts",
  },
  {
    href: "/categories",
    label: "Categories",
    permission: P.CATALOG_MANAGE,
    description: "Fruit collections and trees",
  },
  {
    href: "/brands",
    label: "Brands",
    permission: P.CATALOG_MANAGE,
    description: "Suppliers and brand labels",
  },
  {
    href: "/tags",
    label: "Tags",
    permission: P.CATALOG_MANAGE,
    description: "Labels for filtering",
  },
  {
    href: "/orders",
    label: "Orders",
    permission: P.ORDERS_MANAGE,
    description: "Customer orders and fulfilment",
  },
  {
    href: "/coupons",
    label: "Coupons",
    permission: P.COUPONS_MANAGE,
    description: "Discount codes and promotions",
  },
  {
    href: "/notifications",
    label: "Notifications",
    permission: P.NOTIFICATIONS_READ,
    description: "Order email and SMS delivery log",
  },
  {
    href: "/users",
    label: "Users",
    permission: P.USERS_LIST,
    description: "Staff, admins, and customers",
  },
  {
    href: "/roles",
    label: "Roles",
    permission: P.ROLES_LIST,
    description: "Roles and permission codes",
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
  return match?.label ?? "Fruit Shop";
}

/** Permission required for the current path (null = open to any signed-in user). */
export function requiredPermissionForPath(pathname: string): PermissionCode | null {
  const match = NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
  return match?.permission ?? null;
}

export function visibleNav(
  hasPermission: (permission: string) => boolean,
): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
}
