"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { AccountShell } from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import { formatMoney, orderStatusLabel, ordersApi } from "@/src/modules/orders/api";

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
      title="Your orders"
      subtitle="Track deliveries, view receipts, and cancel when eligible."
    >
      <div className="rounded-2xl border border-[var(--fs-line)] bg-white shadow-sm">
        {orders.isLoading && (
          <p className="px-6 py-12 text-sm text-[var(--fs-muted)]">Loading orders…</p>
        )}
        {orders.error && (
          <p className="px-6 py-12 text-sm text-rose-600">{orders.error.message}</p>
        )}
        {orders.data && orders.data.items.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-xl">No orders yet</p>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              When you checkout, orders show up here.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[var(--fs-mango)] px-6 py-3 text-sm font-semibold text-[var(--fs-orchard)]"
            >
              Start shopping
            </Link>
          </div>
        )}
        {orders.data && orders.data.items.length > 0 && (
          <ul className="divide-y divide-[var(--fs-line)]">
            {orders.data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--fs-mist)]/40 sm:px-6"
                >
                  <div>
                    <p className="font-medium text-[var(--fs-ink)]">{order.order_number}</p>
                    <p className="text-sm text-[var(--fs-muted)]">
                      {formatWhen(order.created_at)} · {order.items.length} items ·{" "}
                      {order.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(order.total)}</p>
                    <p className="text-xs capitalize text-[var(--fs-leaf)]">
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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
