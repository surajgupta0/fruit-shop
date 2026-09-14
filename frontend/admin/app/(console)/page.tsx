"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { P } from "@/src/console/permissions";
import { PageHeader, SectionLabel, StatusPill, Surface } from "@/src/console/ui";
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

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  href?: string;
}) {
  const toneBorder =
    tone === "danger"
      ? "border-rose-200/80"
      : tone === "warn"
        ? "border-amber-200/80"
        : tone === "ok"
          ? "border-[var(--fs-leaf)]/25"
          : "border-[var(--fs-line)]";

  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fs-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--fs-ink)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug text-[var(--fs-muted)]">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-[var(--fs-radius)] border bg-white p-4 shadow-[var(--fs-shadow-sm)] transition hover:border-[var(--fs-leaf)]/40 ${toneBorder}`}
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      className={`rounded-[var(--fs-radius)] border bg-white p-4 shadow-[var(--fs-shadow-sm)] ${toneBorder}`}
    >
      {body}
    </div>
  );
}

function PipelineStep({
  label,
  count,
  href,
  emphasize,
}: {
  label: string;
  count: number | string;
  href: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col rounded-xl border px-3 py-3 text-center transition hover:border-[var(--fs-leaf)]/40 ${
        emphasize
          ? "border-amber-200 bg-amber-50/60"
          : "border-[var(--fs-line)] bg-[var(--fs-mist)]/30"
      }`}
    >
      <span className="font-[family-name:var(--font-fraunces)] text-2xl tabular-nums text-[var(--fs-ink)]">
        {count}
      </span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--fs-muted)]">
        {label}
      </span>
    </Link>
  );
}

type AttentionItem = {
  id: string;
  severity: "danger" | "warn" | "ok";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

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
  const deliveredOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "delivered" }),
    [],
    { enabled: canOrders },
  );
  const cancelledOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "cancelled" }),
    [],
    { enabled: canOrders },
  );
  const recentOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 8 }),
    [],
    { enabled: canOrders },
  );
  const unpaidPaidFilter = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, payment_status: "pending" }),
    [],
    { enabled: canOrders },
  );

  const lowStock = useQuery(
    () => inventoryApi.listLowStock({ page: 1, page_size: 8 }),
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
    () => notificationsApi.listLogs({ page: 1, page_size: 30 }),
    [],
    { enabled: canNotifications },
  );

  const pipeline = useMemo(
    () => ({
      pending: pendingOrders.data?.total ?? 0,
      confirmed: confirmedOrders.data?.total ?? 0,
      processing: processingOrders.data?.total ?? 0,
      shipped: shippedOrders.data?.total ?? 0,
      delivered: deliveredOrders.data?.total ?? 0,
      cancelled: cancelledOrders.data?.total ?? 0,
    }),
    [
      pendingOrders.data,
      confirmedOrders.data,
      processingOrders.data,
      shippedOrders.data,
      deliveredOrders.data,
      cancelledOrders.data,
    ],
  );

  const toFulfil = pipeline.confirmed + pipeline.processing;
  const inTransit = pipeline.shipped;
  const awaitingPayment = unpaidPaidFilter.data?.total ?? pipeline.pending;

  const recentRevenue = useMemo(() => {
    const items = recentOrders.data?.items ?? [];
    return items
      .filter((o) => o.status !== "cancelled" && o.payment_status !== "failed")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [recentOrders.data]);

  const failedNotifications = useMemo(
    () => (notificationLogs.data?.items ?? []).filter((l) => l.status === "failed"),
    [notificationLogs.data],
  );

  const activeCouponCount = coupons.data?.items?.length ?? coupons.data?.total ?? 0;
  const lowStockTotal = lowStock.data?.total ?? 0;
  const outStockTotal = outOfStock.data?.total ?? 0;
  const draftTotal = draftProducts.data?.total ?? 0;
  const activeTotal = activeProducts.data?.total ?? 0;

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    if (canOrders && toFulfil > 0) {
      items.push({
        id: "fulfil",
        severity: "warn",
        title: `${toFulfil} order${toFulfil === 1 ? "" : "s"} waiting to ship`,
        detail: "Confirmed or packing — move them through fulfilment.",
        href: "/orders?status=confirmed",
        cta: "Open queue",
      });
    }
    if (canOrders && awaitingPayment > 0) {
      items.push({
        id: "pay",
        severity: "warn",
        title: `${awaitingPayment} unpaid / pending payment`,
        detail: "Online checkouts still waiting for payment confirmation.",
        href: "/orders?status=pending",
        cta: "Review",
      });
    }
    if (canInventory && outStockTotal > 0) {
      items.push({
        id: "oos",
        severity: "danger",
        title: `${outStockTotal} SKU${outStockTotal === 1 ? "" : "s"} out of stock`,
        detail: "Customers cannot buy these while stock is zero.",
        href: "/inventory",
        cta: "Restock",
      });
    } else if (canInventory && lowStockTotal > 0) {
      items.push({
        id: "low",
        severity: "warn",
        title: `${lowStockTotal} SKU${lowStockTotal === 1 ? "" : "s"} running low`,
        detail: "Below threshold — plan supplier receives soon.",
        href: "/inventory",
        cta: "View stock",
      });
    }
    if (canNotifications && failedNotifications.length > 0) {
      items.push({
        id: "notify",
        severity: "danger",
        title: `${failedNotifications.length} recent notification failure${failedNotifications.length === 1 ? "" : "s"}`,
        detail: "Email/SMS delivery failed for order updates.",
        href: "/notifications",
        cta: "Inspect logs",
      });
    }
    if (canCatalog && draftTotal > 0 && activeTotal === 0) {
      items.push({
        id: "catalog",
        severity: "warn",
        title: "No live products on the storefront",
        detail: `${draftTotal} draft${draftTotal === 1 ? "" : "s"} waiting to publish.`,
        href: "/products?status=draft",
        cta: "Publish",
      });
    }
    if (items.length === 0) {
      items.push({
        id: "ok",
        severity: "ok",
        title: "Operations look steady",
        detail: "No urgent fulfilment, stock, or delivery issues right now.",
        href: canOrders ? "/orders" : "/",
        cta: canOrders ? "Browse orders" : "OK",
      });
    }
    return items;
  }, [
    canOrders,
    canInventory,
    canNotifications,
    canCatalog,
    toFulfil,
    awaitingPayment,
    outStockTotal,
    lowStockTotal,
    failedNotifications.length,
    draftTotal,
    activeTotal,
  ]);

  const urgentCount = attention.filter((a) => a.severity !== "ok").length;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const asOf = new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description={`Operations pulse · ${asOf}`}
        actions={
          urgentCount > 0 ? (
            <StatusPill tone="warn">{urgentCount} need attention</StatusPill>
          ) : (
            <StatusPill tone="ok">All clear</StatusPill>
          )
        }
      />

      {/* KPI strip — industry command view */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canOrders && (
          <>
            <Kpi
              label="To fulfil"
              value={toFulfil}
              hint="Confirmed + packing"
              tone={toFulfil > 0 ? "warn" : "ok"}
              href="/orders?status=confirmed"
            />
            <Kpi
              label="In transit"
              value={inTransit}
              hint="Shipped, not delivered"
              href="/orders?status=shipped"
            />
            <Kpi
              label="Recent page GMV"
              value={recentOrders.isLoading ? "…" : formatMoney(recentRevenue)}
              hint="Sum of latest 8 orders (excl. cancelled)"
              href="/orders"
            />
          </>
        )}
        {canInventory && (
          <Kpi
            label="Stock risk"
            value={outStockTotal > 0 ? outStockTotal : lowStockTotal}
            hint={
              outStockTotal > 0
                ? "Out of stock SKUs"
                : lowStockTotal > 0
                  ? "Low stock SKUs"
                  : "No stock alerts"
            }
            tone={outStockTotal > 0 ? "danger" : lowStockTotal > 0 ? "warn" : "ok"}
            href="/inventory"
          />
        )}
        {!canOrders && canCatalog && (
          <Kpi
            label="Live products"
            value={activeTotal}
            hint={`${draftTotal} drafts`}
            href="/products?status=active"
          />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attention queue */}
        <section className="lg:col-span-2">
          <SectionLabel>Needs attention</SectionLabel>
          <Surface className="divide-y divide-[var(--fs-line)]">
            {attention.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <StatusPill tone={item.severity}>
                  {item.severity === "ok"
                    ? "OK"
                    : item.severity === "danger"
                      ? "Urgent"
                      : "Action"}
                </StatusPill>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--fs-ink)]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--fs-muted)]">{item.detail}</p>
                  {item.severity !== "ok" && (
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-xs font-semibold text-[var(--fs-leaf)] hover:underline"
                    >
                      {item.cta} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </Surface>
        </section>

        {/* Fulfilment pipeline */}
        {canOrders && (
          <section className="lg:col-span-3">
            <SectionLabel>Fulfilment pipeline</SectionLabel>
            <Surface padded>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <PipelineStep
                  label="Pending"
                  count={pendingOrders.isLoading ? "…" : pipeline.pending}
                  href="/orders?status=pending"
                  emphasize={pipeline.pending > 0}
                />
                <PipelineStep
                  label="Confirmed"
                  count={confirmedOrders.isLoading ? "…" : pipeline.confirmed}
                  href="/orders?status=confirmed"
                  emphasize={pipeline.confirmed > 0}
                />
                <PipelineStep
                  label="Packing"
                  count={processingOrders.isLoading ? "…" : pipeline.processing}
                  href="/orders?status=processing"
                  emphasize={pipeline.processing > 0}
                />
                <PipelineStep
                  label="Shipped"
                  count={shippedOrders.isLoading ? "…" : pipeline.shipped}
                  href="/orders?status=shipped"
                />
                <PipelineStep
                  label="Delivered"
                  count={deliveredOrders.isLoading ? "…" : pipeline.delivered}
                  href="/orders?status=delivered"
                />
              </div>
              <p className="mt-4 text-xs text-[var(--fs-muted)]">
                {pipeline.cancelled > 0
                  ? `${pipeline.cancelled} cancelled on record · `
                  : ""}
                Move orders left → right; shipping requires packing first.
              </p>
            </Surface>
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        {canOrders && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <SectionLabel>Latest orders</SectionLabel>
              <Link href="/orders" className="text-sm text-[var(--fs-leaf)] hover:underline">
                All orders →
              </Link>
            </div>
            <Surface>
              {recentOrders.isLoading && (
                <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">Loading orders…</p>
              )}
              {recentOrders.data && recentOrders.data.items.length === 0 && (
                <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">
                  No orders yet — storefront checkouts will appear here.
                </p>
              )}
              {recentOrders.data && recentOrders.data.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase tracking-wide text-[var(--fs-muted)]">
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fs-line)]">
                      {recentOrders.data.items.map((order: Order) => (
                        <tr key={order.id} className="hover:bg-[var(--fs-mist)]/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-medium hover:text-[var(--fs-leaf)]"
                            >
                              {order.order_number}
                            </Link>
                            <p className="text-xs text-[var(--fs-muted)]">
                              {formatWhen(order.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-xs text-[var(--fs-muted)]">
                              {order.customer_phone}
                            </p>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{formatMoney(order.total)}</td>
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

        {/* Stock risk */}
        {canInventory && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <SectionLabel>Stock risk</SectionLabel>
              <Link href="/inventory" className="text-sm text-[var(--fs-leaf)] hover:underline">
                Inventory →
              </Link>
            </div>
            <Surface>
              {lowStock.isLoading && (
                <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">Scanning stock…</p>
              )}
              {lowStock.data && lowStock.data.items.length === 0 && (
                <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">
                  All tracked SKUs are above threshold.
                </p>
              )}
              {lowStock.data && lowStock.data.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase tracking-wide text-[var(--fs-muted)]">
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold">Avail</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fs-line)]">
                      {lowStock.data.items.map((row) => (
                        <tr key={row.variant_id} className="hover:bg-[var(--fs-mist)]/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/products/${row.product_id}`}
                              className="font-medium hover:text-[var(--fs-leaf)]"
                            >
                              {row.product_name}
                            </Link>
                            <p className="text-xs text-[var(--fs-muted)]">{row.variant_name}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                          <td className="px-4 py-3 tabular-nums">{row.available_qty}</td>
                          <td className="px-4 py-3">
                            <StatusPill tone={row.is_out_of_stock ? "danger" : "warn"}>
                              {row.is_out_of_stock ? "Out" : "Low"}
                            </StatusPill>
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
      </div>

      {/* Secondary health row — catalog / offers / notifications */}
      <section>
        <SectionLabel>Store health</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canCatalog && (
            <>
              <Kpi
                label="Live catalog"
                value={activeProducts.isLoading ? "…" : activeTotal}
                hint="Active products on storefront"
                href="/products?status=active"
                tone={activeTotal > 0 ? "ok" : "warn"}
              />
              <Kpi
                label="Drafts"
                value={draftProducts.isLoading ? "…" : draftTotal}
                hint="Not published yet"
                href="/products?status=draft"
                tone={draftTotal > 5 ? "warn" : "neutral"}
              />
            </>
          )}
          {canCoupons && (
            <Kpi
              label="Active offers"
              value={coupons.isLoading ? "…" : activeCouponCount}
              hint="Coupons customers can browse"
              href="/coupons"
            />
          )}
          {canNotifications && (
            <Kpi
              label="Notify failures"
              value={
                notificationLogs.isLoading
                  ? "…"
                  : failedNotifications.length
              }
              hint="In latest delivery log sample"
              href="/notifications"
              tone={failedNotifications.length > 0 ? "danger" : "ok"}
            />
          )}
        </div>
      </section>
    </div>
  );
}
