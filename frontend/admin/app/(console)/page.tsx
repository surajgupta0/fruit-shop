"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { P } from "@/src/console/permissions";
import {
  AlertBanner,
  EmptyState,
  ErrorLine,
  LoadingLine,
  PageHeader,
  PageLoader,
  SectionLabel,
  SkeletonBlock,
  StatusPill,
  Surface,
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

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  href?: string;
  loading?: boolean;
}) {
  const toneBorder =
    tone === "danger"
      ? "border-rose-200/80"
      : tone === "warn"
        ? "border-amber-200/80"
        : tone === "ok"
          ? "border-[var(--fs-leaf)]/25"
          : "border-[var(--fs-line)]";

  const body = loading ? (
    <div className="space-y-3" aria-hidden>
      <div className="h-2.5 w-20 animate-pulse rounded-full bg-[var(--fs-mist)]" />
      <div className="h-8 w-14 animate-pulse rounded-md bg-[var(--fs-mist)]" />
      <div className="h-2 w-28 animate-pulse rounded-full bg-[var(--fs-mist)]" />
    </div>
  ) : (
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

  if (href && !loading) {
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
      aria-busy={loading || undefined}
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
  loading,
}: {
  label: string;
  count: number | string;
  href: string;
  emphasize?: boolean;
  loading?: boolean;
}) {
  const content = (
    <>
      {loading ? (
        <span className="mx-auto block h-7 w-10 animate-pulse rounded-md bg-[var(--fs-mist)]" />
      ) : (
        <span className="font-[family-name:var(--font-fraunces)] text-2xl tabular-nums text-[var(--fs-ink)]">
          {count}
        </span>
      )}
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--fs-muted)]">
        {label}
      </span>
    </>
  );

  const className = `flex min-w-0 flex-1 flex-col rounded-xl border px-3 py-3 text-center transition ${
    emphasize
      ? "border-amber-200 bg-amber-50/60"
      : "border-[var(--fs-line)] bg-[var(--fs-mist)]/30"
  } ${loading ? "" : "hover:border-[var(--fs-leaf)]/40"}`;

  if (loading) {
    return (
      <div className={className} aria-busy>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
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

  const activeQueries = useMemo(() => {
    const q = [];
    if (canCatalog) q.push(activeProducts, draftProducts);
    if (canOrders) {
      q.push(
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        recentOrders,
        unpaidPaidFilter,
      );
    }
    if (canInventory) q.push(lowStock, outOfStock);
    if (canCoupons) q.push(coupons);
    if (canNotifications) q.push(notificationLogs);
    return q;
  }, [
    canCatalog,
    canOrders,
    canInventory,
    canCoupons,
    canNotifications,
    activeProducts,
    draftProducts,
    pendingOrders,
    confirmedOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    recentOrders,
    unpaidPaidFilter,
    lowStock,
    outOfStock,
    coupons,
    notificationLogs,
  ]);

  const isBootstrapping =
    activeQueries.length > 0 && activeQueries.every((q) => q.isLoading && !q.data && !q.error);
  const hasAnyError = activeQueries.some((q) => Boolean(q.error));
  const failedMessages = activeQueries
    .filter((q) => q.error)
    .map((q) => q.error!.message)
    .filter((msg, i, arr) => arr.indexOf(msg) === i);

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

  const ordersLoading =
    pendingOrders.isLoading ||
    confirmedOrders.isLoading ||
    processingOrders.isLoading ||
    shippedOrders.isLoading ||
    deliveredOrders.isLoading;
  const inventoryLoading = lowStock.isLoading || outOfStock.isLoading;

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    if (canOrders && !ordersLoading && toFulfil > 0) {
      items.push({
        id: "fulfil",
        severity: "warn",
        title: `${toFulfil} order${toFulfil === 1 ? "" : "s"} waiting to ship`,
        detail: "Confirmed or packing — move them through fulfilment.",
        href: "/orders?status=confirmed",
        cta: "Open queue",
      });
    }
    if (canOrders && !unpaidPaidFilter.isLoading && awaitingPayment > 0) {
      items.push({
        id: "pay",
        severity: "warn",
        title: `${awaitingPayment} unpaid / pending payment`,
        detail: "Online checkouts still waiting for payment confirmation.",
        href: "/orders?status=pending",
        cta: "Review",
      });
    }
    if (canInventory && !inventoryLoading && outStockTotal > 0) {
      items.push({
        id: "oos",
        severity: "danger",
        title: `${outStockTotal} SKU${outStockTotal === 1 ? "" : "s"} out of stock`,
        detail: "Customers cannot buy these while stock is zero.",
        href: "/inventory",
        cta: "Restock",
      });
    } else if (canInventory && !inventoryLoading && lowStockTotal > 0) {
      items.push({
        id: "low",
        severity: "warn",
        title: `${lowStockTotal} SKU${lowStockTotal === 1 ? "" : "s"} running low`,
        detail: "Below threshold — plan supplier receives soon.",
        href: "/inventory",
        cta: "View stock",
      });
    }
    if (canNotifications && !notificationLogs.isLoading && failedNotifications.length > 0) {
      items.push({
        id: "notify",
        severity: "danger",
        title: `${failedNotifications.length} recent notification failure${failedNotifications.length === 1 ? "" : "s"}`,
        detail: "Email/SMS delivery failed for order updates.",
        href: "/notifications",
        cta: "Inspect logs",
      });
    }
    if (
      canCatalog &&
      !activeProducts.isLoading &&
      !draftProducts.isLoading &&
      draftTotal > 0 &&
      activeTotal === 0
    ) {
      items.push({
        id: "catalog",
        severity: "warn",
        title: "No live products on the storefront",
        detail: `${draftTotal} draft${draftTotal === 1 ? "" : "s"} waiting to publish.`,
        href: "/products?status=draft",
        cta: "Publish",
      });
    }
    if (items.length === 0 && !isBootstrapping) {
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
    ordersLoading,
    inventoryLoading,
    unpaidPaidFilter.isLoading,
    notificationLogs.isLoading,
    activeProducts.isLoading,
    draftProducts.isLoading,
    toFulfil,
    awaitingPayment,
    outStockTotal,
    lowStockTotal,
    failedNotifications.length,
    draftTotal,
    activeTotal,
    isBootstrapping,
  ]);

  const urgentCount = attention.filter((a) => a.severity !== "ok").length;
  const topAlert = attention.find((a) => a.severity === "danger") ?? attention.find((a) => a.severity === "warn");
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const asOf = new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isBootstrapping) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title={`Good to see you, ${firstName}`}
          description={`Operations pulse · ${asOf}`}
          actions={<StatusPill tone="neutral">Syncing</StatusPill>}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <PageLoader />
      </div>
    );
  }

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

      {hasAnyError && (
        <AlertBanner
          tone="danger"
          title="Some overview signals couldn’t load"
          action={
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-50"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          }
        >
          {failedMessages[0] ?? "Please refresh or try again in a moment."}
          {failedMessages.length > 1
            ? ` (+${failedMessages.length - 1} more)`
            : null}
        </AlertBanner>
      )}

      {!hasAnyError && topAlert && topAlert.severity !== "ok" && (
        <AlertBanner
          tone={topAlert.severity}
          title={topAlert.title}
          action={
            <Link
              href={topAlert.href}
              className="inline-flex rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
            >
              {topAlert.cta} →
            </Link>
          }
        >
          {topAlert.detail}
        </AlertBanner>
      )}

      {!hasAnyError && urgentCount === 0 && (
        <AlertBanner tone="ok" title="Operations look steady">
          Fulfilment, stock, and delivery signals are within expected ranges.
        </AlertBanner>
      )}

      {/* KPI strip */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canOrders && (
          <>
            <Kpi
              label="To fulfil"
              value={toFulfil}
              hint="Confirmed + packing"
              tone={toFulfil > 0 ? "warn" : "ok"}
              href="/orders?status=confirmed"
              loading={ordersLoading}
            />
            <Kpi
              label="In transit"
              value={inTransit}
              hint="Shipped, not delivered"
              href="/orders?status=shipped"
              loading={shippedOrders.isLoading}
            />
            <Kpi
              label="Recent page GMV"
              value={formatMoney(recentRevenue)}
              hint="Sum of latest 8 orders (excl. cancelled)"
              href="/orders"
              loading={recentOrders.isLoading}
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
            loading={inventoryLoading}
          />
        )}
        {!canOrders && canCatalog && (
          <Kpi
            label="Live products"
            value={activeTotal}
            hint={`${draftTotal} drafts`}
            href="/products?status=active"
            loading={activeProducts.isLoading || draftProducts.isLoading}
          />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionLabel>Needs attention</SectionLabel>
          <Surface className="divide-y divide-[var(--fs-line)]">
            {attention.length === 0 ? (
              <LoadingLine label="Evaluating priorities…" />
            ) : (
              attention.map((item) => (
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
              ))
            )}
          </Surface>
        </section>

        {canOrders && (
          <section className="lg:col-span-3">
            <SectionLabel>Fulfilment pipeline</SectionLabel>
            <Surface padded>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <PipelineStep
                  label="Pending"
                  count={pipeline.pending}
                  href="/orders?status=pending"
                  emphasize={pipeline.pending > 0}
                  loading={pendingOrders.isLoading}
                />
                <PipelineStep
                  label="Confirmed"
                  count={pipeline.confirmed}
                  href="/orders?status=confirmed"
                  emphasize={pipeline.confirmed > 0}
                  loading={confirmedOrders.isLoading}
                />
                <PipelineStep
                  label="Packing"
                  count={pipeline.processing}
                  href="/orders?status=processing"
                  emphasize={pipeline.processing > 0}
                  loading={processingOrders.isLoading}
                />
                <PipelineStep
                  label="Shipped"
                  count={pipeline.shipped}
                  href="/orders?status=shipped"
                  loading={shippedOrders.isLoading}
                />
                <PipelineStep
                  label="Delivered"
                  count={pipeline.delivered}
                  href="/orders?status=delivered"
                  loading={deliveredOrders.isLoading}
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
        {canOrders && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <SectionLabel>Latest orders</SectionLabel>
              <Link href="/orders" className="text-sm text-[var(--fs-leaf)] hover:underline">
                All orders →
              </Link>
            </div>
            <Surface>
              {recentOrders.isLoading && <LoadingLine label="Loading orders…" />}
              {recentOrders.error && <ErrorLine message={recentOrders.error.message} />}
              {recentOrders.data && recentOrders.data.items.length === 0 && (
                <EmptyState
                  title="No orders yet"
                  body="Storefront checkouts will appear here as soon as customers place orders."
                />
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

        {canInventory && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <SectionLabel>Stock risk</SectionLabel>
              <Link href="/inventory" className="text-sm text-[var(--fs-leaf)] hover:underline">
                Inventory →
              </Link>
            </div>
            <Surface>
              {lowStock.isLoading && <LoadingLine label="Scanning stock levels…" />}
              {lowStock.error && <ErrorLine message={lowStock.error.message} />}
              {lowStock.data && lowStock.data.items.length === 0 && (
                <EmptyState
                  title="Stock looks healthy"
                  body="All tracked SKUs are above threshold. No restock action needed."
                />
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

      <section>
        <SectionLabel>Store health</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canCatalog && (
            <>
              <Kpi
                label="Live catalog"
                value={activeTotal}
                hint="Active products on storefront"
                href="/products?status=active"
                tone={activeTotal > 0 ? "ok" : "warn"}
                loading={activeProducts.isLoading}
              />
              <Kpi
                label="Drafts"
                value={draftTotal}
                hint="Not published yet"
                href="/products?status=draft"
                tone={draftTotal > 5 ? "warn" : "neutral"}
                loading={draftProducts.isLoading}
              />
            </>
          )}
          {canCoupons && (
            <Kpi
              label="Active offers"
              value={activeCouponCount}
              hint="Coupons customers can browse"
              href="/coupons"
              loading={coupons.isLoading}
            />
          )}
          {canNotifications && (
            <Kpi
              label="Notify failures"
              value={failedNotifications.length}
              hint="In latest delivery log sample"
              href="/notifications"
              tone={failedNotifications.length > 0 ? "danger" : "ok"}
              loading={notificationLogs.isLoading}
            />
          )}
        </div>
      </section>
    </div>
  );
}
