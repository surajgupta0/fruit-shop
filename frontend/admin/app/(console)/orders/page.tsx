"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  ConsolePage,
  EmptyState,
  ErrorLine,
  Input,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
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
      active: items.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
    };
  }, [list.data]);

  const hasFilters = Boolean(status || paymentStatus || search);

  return (
    <ConsolePage width="wide">
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Fulfilment status, payments, and shipping — click a row to manage."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
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

      <Toolbar>
        <Input
          type="search"
          placeholder="Search order #, phone, name, tracking…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[240px] sm:flex-1"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="sm:w-40"
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
          className="sm:w-40"
        >
          <option value="">All payments</option>
          {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Btn
            variant="ghost"
            className="!py-2"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPaymentStatus("");
              setPage(1);
            }}
          >
            Clear
          </Btn>
        )}
      </Toolbar>

      <Surface>
        {list.isLoading && <TableSkeleton rows={8} />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState
            title="No orders found"
            body={
              hasFilters
                ? "Try clearing filters or searching a different order number."
                : "Orders appear here when customers check out on the storefront."
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((order) => (
                    <tr key={order.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-extrabold text-[var(--fs-ink)] hover:text-[var(--fs-accent-deep)]"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-xs font-medium text-[var(--fs-muted)]">
                          {formatWhen(order.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold">{order.customer_name}</p>
                        <p className="text-xs font-medium text-[var(--fs-muted)]">
                          {order.customer_phone}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--fs-muted)]">
                        {order.items.reduce((n, i) => n + i.quantity, 0)} units ·{" "}
                        {order.items.length} lines
                      </td>
                      <td className="px-4 py-3.5 font-extrabold tabular-nums">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={orderStatusTone(order.status)}>
                          {order.status}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <StatusPill tone={paymentStatusTone(order.payment_status)}>
                            {order.payment_status}
                          </StatusPill>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--fs-muted)]">
                            {order.payment_method}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              totalPages={totalPages}
              total={list.data.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </Surface>
    </ConsolePage>
  );
}

export default function OrdersPage() {
  return (
    <RequirePermission permission={P.ORDERS_MANAGE}>
      <Suspense
        fallback={
          <ConsolePage width="wide">
            <TableSkeleton rows={8} />
          </ConsolePage>
        }
      >
        <OrdersPanel />
      </Suspense>
    </RequirePermission>
  );
}
