"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  EmptyState,
  ErrorLine,
  Input,
  LoadingLine,
  PageHeader,
  Select,
  StatusPill,
  Surface,
  StatCard,
} from "@/src/console/ui";
import {
  formatMoney,
  ORDER_STATUSES,
  orderStatusTone,
  ordersApi,
  paymentStatusTone,
  type OrderStatus,
  type PaymentStatus,
} from "@/src/modules/orders/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function OrdersPanel() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as OrderStatus | null) || "";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      search: search.trim() || undefined,
    }),
    [page, status, paymentStatus, search],
  );

  const list = useQuery(() => ordersApi.list(params), [params]);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  const stats = useMemo(() => {
    const items = list.data?.items ?? [];
    return {
      pageTotal: items.reduce((sum, o) => sum + Number(o.total), 0),
      pending: items.filter((o) => o.status === "pending").length,
      active: items.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
    };
  }, [list.data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Orders"
        description="Customer orders — fulfilment status, payments, and shipping details."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total orders"
          value={list.data?.total ?? 0}
          loading={list.isLoading}
          hint="Matching current filters"
        />
        <StatCard
          label="Open on this page"
          value={stats.active}
          loading={list.isLoading}
          hint="Not delivered or cancelled"
        />
        <StatCard
          label="Page revenue"
          value={formatMoney(stats.pageTotal) ?? "₹0"}
          loading={list.isLoading}
          hint="Sum of rows shown"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          type="search"
          placeholder="Search order #, phone, name, tracking…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="sm:max-w-[11rem]"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | "");
            setPage(1);
          }}
          className="sm:max-w-[11rem]"
        >
          <option value="">All payments</option>
          {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <Surface>
        {list.isLoading && <LoadingLine label="Loading orders…" />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-[0.1em] text-[var(--fs-muted)]">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--fs-mist)]/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-[var(--fs-ink)] hover:text-[var(--fs-accent)]"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-xs text-[var(--fs-muted)]">
                          {formatWhen(order.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-[var(--fs-muted)]">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--fs-muted)]">
                        {order.items.reduce((n, i) => n + i.quantity, 0)} units ·{" "}
                        {order.items.length} lines
                      </td>
                      <td className="px-4 py-3 font-medium">{formatMoney(order.total)}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={orderStatusTone(order.status)}>
                          {order.status}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusPill tone={paymentStatusTone(order.payment_status)}>
                            {order.payment_status}
                          </StatusPill>
                          <span className="text-[10px] uppercase tracking-wide text-[var(--fs-muted)]">
                            {order.payment_method}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data.items.length === 0 && (
              <EmptyState
                title="No orders yet"
                body="Orders appear here when customers check out on the storefront."
              />
            )}
            <div className="flex items-center justify-between border-t border-[var(--fs-line)] px-4 py-3 text-sm text-[var(--fs-muted)]">
              <span>
                {list.data.total} total · page {list.data.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Btn
                  variant="secondary"
                  className="!py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Btn>
                <Btn
                  variant="secondary"
                  className="!py-1.5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Btn>
              </div>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequirePermission permission={P.ORDERS_MANAGE}>
      <Suspense fallback={<LoadingLine label="Loading orders…" />}>
        <OrdersPanel />
      </Suspense>
    </RequirePermission>
  );
}
