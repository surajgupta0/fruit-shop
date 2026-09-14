/**
 * Single source for console sidebar links.
 * Add a route + entry here when a new panel ships.
 */
import { P, type PermissionCode } from "./permissions";

export type NavGroup = "main" | "catalog" | "commerce" | "team";

export type NavItem = {
  href: string;
  label: string;
  /** null = visible to any signed-in staff */
  permission: PermissionCode | null;
  description: string;
  group: NavGroup;
};

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  main: "",
  catalog: "Catalog",
  commerce: "Commerce",
  team: "Team",
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    permission: null,
    description: "Ops dashboard and shortcuts",
    group: "main",
  },
  {
    href: "/products",
    label: "Products",
    permission: P.CATALOG_MANAGE,
    description: "Catalog SKUs and listings",
    group: "catalog",
  },
  {
    href: "/inventory",
    label: "Inventory",
    permission: P.INVENTORY_MANAGE,
    description: "Stock levels and low-stock alerts",
    group: "catalog",
  },
  {
    href: "/categories",
    label: "Categories",
    permission: P.CATALOG_MANAGE,
    description: "Fruit collections and trees",
    group: "catalog",
  },
  {
    href: "/brands",
    label: "Brands",
    permission: P.CATALOG_MANAGE,
    description: "Suppliers and brand labels",
    group: "catalog",
  },
  {
    href: "/tags",
    label: "Tags",
    permission: P.CATALOG_MANAGE,
    description: "Labels for filtering",
    group: "catalog",
  },
  {
    href: "/orders",
    label: "Orders",
    permission: P.ORDERS_MANAGE,
    description: "Customer orders and fulfilment",
    group: "commerce",
  },
  {
    href: "/coupons",
    label: "Coupons",
    permission: P.COUPONS_MANAGE,
    description: "Discount codes and promotions",
    group: "commerce",
  },
  {
    href: "/notifications",
    label: "Notifications",
    permission: P.NOTIFICATIONS_READ,
    description: "Order email and SMS delivery log",
    group: "commerce",
  },
  {
    href: "/users",
    label: "Users",
    permission: P.USERS_LIST,
    description: "Staff, admins, and customers",
    group: "team",
  },
  {
    href: "/roles",
    label: "Roles",
    permission: P.ROLES_LIST,
    description: "Roles and permission codes",
    group: "team",
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

export function pageDescription(pathname: string): string | undefined {
  const match = NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
  return match?.description;
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

export function groupedNav(items: NavItem[]): { group: NavGroup; label: string; items: NavItem[] }[] {
  const order: NavGroup[] = ["main", "catalog", "commerce", "team"];
  return order
    .map((group) => ({
      group,
      label: NAV_GROUP_LABELS[group],
      items: items.filter((i) => i.group === group),
    }))
    .filter((g) => g.items.length > 0);
}
