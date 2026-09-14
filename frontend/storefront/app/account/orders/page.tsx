"use client";

import Link from "next/link";
import { useQuery } from "@fruitshop/web-core";

import {
  AccountCard,
  AccountEmpty,
  AccountLoader,
  AccountShell,
  StatusBadge,
} from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import { formatMoney, ordersApi } from "@/src/modules/orders/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function OrdersPanel() {
  const orders = useQuery(() => ordersApi.list({ page: 1, page_size: 30 }), []);

  return (
    <AccountShell
      title="Orders"
      subtitle="Track deliveries, view receipts, and cancel when eligible."
      actions={
        <Link href="/shop" className="fs-btn-primary !py-2.5">
          Shop again
        </Link>
      }
    >
      {orders.isLoading && (
        <AccountCard>
          <AccountLoader label="Loading your orders…" />
        </AccountCard>
      )}

      {orders.error && (
        <AccountCard>
          <p className="text-sm font-semibold text-rose-600">{orders.error.message}</p>
        </AccountCard>
      )}

      {orders.data && orders.data.items.length === 0 && (
        <AccountEmpty
          title="No orders yet"
          body="When you checkout, your orders will appear here with live status."
          href="/shop"
          cta="Start shopping"
        />
      )}

      {orders.data && orders.data.items.length > 0 && (
        <AccountCard padded={false}>
          <ul className="divide-y divide-[var(--fs-line)]">
            {orders.data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--fs-mist)]/50 sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-[var(--fs-ink)]">{order.order_number}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">
                      {formatWhen(order.created_at)} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"} · {order.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold">{formatMoney(order.total)}</p>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-[var(--fs-muted)]">
                      {order.payment_status}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </AccountCard>
      )}
    </AccountShell>
  );
}

export default function OrderHistoryPage() {
  return (
    <RequireAuth>
      <OrdersPanel />
    </RequireAuth>
  );
}
