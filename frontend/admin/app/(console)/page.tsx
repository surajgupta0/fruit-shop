"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { P } from "@/src/console/permissions";
import {
  AlertBanner,
  ConsolePage,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionLabel,
  SkeletonBlock,
  StatCard,
  StatusPill,
  Surface,
  TableHead,
} from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";
import { couponsApi } from "@/src/modules/coupons/api";
import { inventoryApi } from "@/src/modules/inventory/api";
import { notificationsApi } from "@/src/modules/notifications/api";
import {
  formatMoney,
  orderStatusTone,
  ordersApi,
  paymentStatusTone,
  type Order,
  type OrderStatus,
} from "@/src/modules/orders/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ConsoleOverviewPage() {
  const { user, hasPermission } = useAuth();
  const canCatalog = hasPermission(P.CATALOG_MANAGE);
  const canInventory = hasPermission(P.INVENTORY_MANAGE);
  const canOrders = hasPermission(P.ORDERS_MANAGE);
  const canCoupons = hasPermission(P.COUPONS_MANAGE);
  const canNotifications = hasPermission(P.NOTIFICATIONS_READ);

  const activeProducts = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, status: "active" }),
    [],
    { enabled: canCatalog },
  );
  const draftProducts = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, status: "draft" }),
    [],
    { enabled: canCatalog },
  );
  const categories = useQuery(() => catalogApi.listCategories(), [], { enabled: canCatalog });
  const brands = useQuery(() => catalogApi.listBrands(), [], { enabled: canCatalog });
  const tags = useQuery(() => catalogApi.listTags(), [], { enabled: canCatalog });

  const allOrders = useQuery(() => ordersApi.list({ page: 1, page_size: 1 }), [], {
    enabled: canOrders,
  });
  const pendingOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "pending" }),
    [],
    { enabled: canOrders },
  );
  const confirmedOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "confirmed" }),
    [],
    { enabled: canOrders },
  );
  const processingOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "processing" }),
    [],
    { enabled: canOrders },
  );
  const shippedOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "shipped" }),
    [],
    { enabled: canOrders },
  );
  const recentOrders = useQuery(() => ordersApi.list({ page: 1, page_size: 6 }), [], {
    enabled: canOrders,
  });

  const lowStock = useQuery(
    () => inventoryApi.listLowStock({ page: 1, page_size: 6 }),
    [],
    { enabled: canInventory },
  );
  const outOfStock = useQuery(
    () =>
      inventoryApi.listLevels({
        page: 1,
        page_size: 1,
        out_of_stock_only: true,
        active_only: true,
      }),
    [],
    { enabled: canInventory },
  );

  const coupons = useQuery(
    () => couponsApi.list({ page: 1, page_size: 50, active_only: true }),
    [],
    { enabled: canCoupons },
  );
  const notificationLogs = useQuery(
    () => notificationsApi.listLogs({ page: 1, page_size: 20 }),
    [],
    { enabled: canNotifications },
  );

  const queries = useMemo(() => {
    const list = [];
    if (canCatalog) list.push(activeProducts, draftProducts, categories, brands, tags);
    if (canOrders) {
      list.push(
        allOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        recentOrders,
      );
    }
    if (canInventory) list.push(lowStock, outOfStock);
    if (canCoupons) list.push(coupons);
    if (canNotifications) list.push(notificationLogs);
    return list;
  }, [
    canCatalog,
    canOrders,
    canInventory,
    canCoupons,
    canNotifications,
    activeProducts,
    draftProducts,
    categories,
    brands,
    tags,
    allOrders,
    pendingOrders,
    confirmedOrders,
    processingOrders,
    shippedOrders,
    recentOrders,
    lowStock,
    outOfStock,
    coupons,
    notificationLogs,
  ]);

  const bootstrapping =
    queries.length > 0 && queries.every((q) => q.isLoading && !q.data && !q.error);
  const hasError = queries.some((q) => Boolean(q.error));

  const toFulfil =
    (confirmedOrders.data?.total ?? 0) + (processingOrders.data?.total ?? 0);
  const openOrders =
    (pendingOrders.data?.total ?? 0) +
    (confirmedOrders.data?.total ?? 0) +
    (processingOrders.data?.total ?? 0) +
    (shippedOrders.data?.total ?? 0);
  const outStock = outOfStock.data?.total ?? 0;
  const lowStockTotal = lowStock.data?.total ?? 0;
  const failedNotify = (notificationLogs.data?.items ?? []).filter(
    (l) => l.status === "failed",
  ).length;

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      tone: "danger" | "warn";
      title: string;
      detail: string;
      href: string;
      cta: string;
    }> = [];
    if (canOrders && toFulfil > 0) {
      items.push({
        id: "fulfil",
        tone: "warn",
        title: `${toFulfil} order${toFulfil === 1 ? "" : "s"} ready to pack/ship`,
        detail: "Confirmed or packing — clear the fulfilment queue.",
        href: "/orders?status=confirmed",
        cta: "Open orders",
      });
    }
    if (canInventory && outStock > 0) {
      items.push({
        id: "oos",
        tone: "danger",
        title: `${outStock} SKU${outStock === 1 ? "" : "s"} out of stock`,
        detail: "These variants cannot be sold until restocked.",
        href: "/inventory",
        cta: "Fix stock",
      });
    } else if (canInventory && lowStockTotal > 0) {
      items.push({
        id: "low",
        tone: "warn",
        title: `${lowStockTotal} SKU${lowStockTotal === 1 ? "" : "s"} running low`,
        detail: "Below threshold — plan receives soon.",
        href: "/inventory",
        cta: "View inventory",
      });
    }
    if (canCatalog && (draftProducts.data?.total ?? 0) > 0 && (activeProducts.data?.total ?? 0) === 0) {
      items.push({
        id: "drafts",
        tone: "warn",
        title: "No live products on the storefront",
        detail: `${draftProducts.data?.total} draft${(draftProducts.data?.total ?? 0) === 1 ? "" : "s"} waiting to publish.`,
        href: "/products?status=draft",
        cta: "Publish",
      });
    }
    if (canNotifications && failedNotify > 0) {
      items.push({
        id: "notify",
        tone: "danger",
        title: `${failedNotify} notification failure${failedNotify === 1 ? "" : "s"}`,
        detail: "Recent email/SMS delivery failed.",
        href: "/notifications",
        cta: "Check logs",
      });
    }
    return items;
  }, [
    canOrders,
    canInventory,
    canCatalog,
    canNotifications,
    toFulfil,
    outStock,
    lowStockTotal,
    draftProducts.data,
    activeProducts.data,
    failedNotify,
  ]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const asOf = new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (bootstrapping) {
    return (
      <ConsolePage width="wide">
        <PageHeader
          eyebrow="Overview"
          title={`Hi, ${firstName}`}
          description="Loading store-wide insights…"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <PageLoader title="Building overview" detail="Pulling orders, catalog, and stock signals…" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage width="wide">
      <PageHeader
        eyebrow="Overview"
        title={`Hi, ${firstName}`}
        description={`Store-wide snapshot · updated ${asOf}`}
        actions={
          alerts.length > 0 ? (
            <StatusPill tone="warn">{alerts.length} need attention</StatusPill>
          ) : (
            <StatusPill tone="ok">Looking good</StatusPill>
          )
        }
      />

      {hasError && (
        <div className="mb-6">
          <AlertBanner
            tone="danger"
            title="Some insights couldn’t load"
            action={
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            }
          >
            Refresh the page or try again in a moment.
          </AlertBanner>
        </div>
      )}

      {/* What needs action now */}
      {alerts.length > 0 && (
        <section className="mb-8 space-y-3">
          <SectionLabel>Needs attention</SectionLabel>
          {alerts.map((a) => (
            <AlertBanner
              key={a.id}
              tone={a.tone}
              title={a.title}
              action={
                <Link
                  href={a.href}
                  className="inline-flex rounded-lg border border-current/20 bg-white/80 px-3 py-1.5 text-xs font-extrabold"
                >
                  {a.cta} →
                </Link>
              }
            >
              {a.detail}
            </AlertBanner>
          ))}
        </section>
      )}

      {/* Overall numbers */}
      <section className="mb-8">
        <SectionLabel>At a glance</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {canOrders && (
            <>
              <StatCard
                label="Open orders"
                value={openOrders}
                hint="Pending → shipped"
                href="/orders"
                tone={openOrders > 0 ? "warn" : "ok"}
                loading={
                  pendingOrders.isLoading ||
                  confirmedOrders.isLoading ||
                  processingOrders.isLoading ||
                  shippedOrders.isLoading
                }
              />
              <StatCard
                label="To fulfil"
                value={toFulfil}
                hint="Confirmed + packing"
                href="/orders?status=confirmed"
                tone={toFulfil > 0 ? "warn" : "neutral"}
                loading={confirmedOrders.isLoading || processingOrders.isLoading}
              />
              <StatCard
                label="All orders"
                value={allOrders.data?.total ?? 0}
                hint="Lifetime total"
                href="/orders"
                loading={allOrders.isLoading}
              />
            </>
          )}
          {canInventory && (
            <StatCard
              label="Stock risk"
              value={outStock > 0 ? outStock : lowStockTotal}
              hint={outStock > 0 ? "Out of stock SKUs" : lowStockTotal > 0 ? "Low stock SKUs" : "Healthy"}
              href="/inventory"
              tone={outStock > 0 ? "danger" : lowStockTotal > 0 ? "warn" : "ok"}
              loading={lowStock.isLoading || outOfStock.isLoading}
            />
          )}
          {canCatalog && (
            <>
              <StatCard
                label="Live products"
                value={activeProducts.data?.total ?? 0}
                hint={`${draftProducts.data?.total ?? 0} drafts`}
                href="/products?status=active"
                loading={activeProducts.isLoading || draftProducts.isLoading}
              />
              <StatCard
                label="Categories"
                value={categories.data?.length ?? 0}
                hint="Storefront collections"
                href="/categories"
                loading={categories.isLoading}
              />
              <StatCard
                label="Brands"
                value={brands.data?.length ?? 0}
                hint="Supplier labels"
                href="/brands"
                loading={brands.isLoading}
              />
              <StatCard
                label="Tags"
                value={tags.data?.length ?? 0}
                hint="Filter labels"
                href="/tags"
                loading={tags.isLoading}
              />
            </>
          )}
          {canCoupons && (
            <StatCard
              label="Active coupons"
              value={coupons.data?.items?.length ?? coupons.data?.total ?? 0}
              hint="Live offers"
              href="/coupons"
              loading={coupons.isLoading}
            />
          )}
        </div>
      </section>

      {/* Fulfilment strip */}
      {canOrders && (
        <section className="mb-8">
          <SectionLabel>Fulfilment pipeline</SectionLabel>
          <Surface padded>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["Pending", pendingOrders.data?.total ?? 0, "/orders?status=pending", pendingOrders.isLoading],
                  ["Confirmed", confirmedOrders.data?.total ?? 0, "/orders?status=confirmed", confirmedOrders.isLoading],
                  ["Packing", processingOrders.data?.total ?? 0, "/orders?status=processing", processingOrders.isLoading],
                  ["Shipped", shippedOrders.data?.total ?? 0, "/orders?status=shipped", shippedOrders.isLoading],
                ] as const
              ).map(([label, count, href, loading]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/40 px-3 py-3 text-center transition hover:border-[var(--fs-accent)]/40"
                >
                  {loading ? (
                    <span className="fs-skeleton mx-auto block h-7 w-10" />
                  ) : (
                    <p className="text-2xl font-extrabold tabular-nums">{count}</p>
                  )}
                  <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
                    {label}
                  </p>
                </Link>
              ))}
            </div>
          </Surface>
        </section>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {canOrders && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <SectionLabel>Latest orders</SectionLabel>
              <Link href="/orders" className="text-sm font-bold text-[var(--fs-accent)] hover:underline">
                All orders →
              </Link>
            </div>
            <Surface>
              {recentOrders.isLoading && (
                <div className="p-4">
                  <SkeletonBlock />
                </div>
              )}
              {recentOrders.data && recentOrders.data.items.length === 0 && (
                <EmptyState title="No orders yet" body="Storefront checkouts will show up here." />
              )}
              {recentOrders.data && recentOrders.data.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <TableHead>
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </TableHead>
                    <tbody className="divide-y divide-[var(--fs-line)]">
                      {recentOrders.data.items.map((order: Order) => (
                        <tr key={order.id} className="hover:bg-[var(--fs-mist)]/40">
                          <td className="px-4 py-3">
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-extrabold hover:text-[var(--fs-accent)]"
                            >
                              {order.order_number}
                            </Link>
                            <p className="text-xs font-medium text-[var(--fs-muted)]">
                              {order.customer_name} · {formatWhen(order.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-extrabold tabular-nums">
                            {formatMoney(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <StatusPill tone={orderStatusTone(order.status as OrderStatus)}>
                                {order.status}
                              </StatusPill>
                              <StatusPill tone={paymentStatusTone(order.payment_status)}>
                                {order.payment_status}
                              </StatusPill>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>
          </section>
        )}

        {canInventory && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <SectionLabel>Stock risk</SectionLabel>
              <Link
                href="/inventory"
                className="text-sm font-bold text-[var(--fs-accent)] hover:underline"
              >
                Inventory →
              </Link>
            </div>
            <Surface>
              {lowStock.isLoading && (
                <div className="p-4">
                  <SkeletonBlock />
                </div>
              )}
              {lowStock.data && lowStock.data.items.length === 0 && (
                <EmptyState title="Stock looks healthy" body="No SKUs below threshold." />
              )}
              {lowStock.data && lowStock.data.items.length > 0 && (
                <ul className="divide-y divide-[var(--fs-line)]">
                  {lowStock.data.items.map((row) => (
                    <li key={row.variant_id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${row.product_id}`}
                          className="font-extrabold hover:text-[var(--fs-accent)]"
                        >
                          {row.product_name}
                        </Link>
                        <p className="truncate text-xs font-medium text-[var(--fs-muted)]">
                          {row.variant_name} · {row.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold tabular-nums">{row.available_qty}</p>
                        <StatusPill tone={row.is_out_of_stock ? "danger" : "warn"}>
                          {row.is_out_of_stock ? "Out" : "Low"}
                        </StatusPill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>
        )}
      </div>
    </ConsolePage>
  );
}
