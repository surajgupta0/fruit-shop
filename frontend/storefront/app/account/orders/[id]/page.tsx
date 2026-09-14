"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { AccountShell } from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import {
  formatMoney,
  orderStatusLabel,
  ordersApi,
  type OrderStatus,
} from "@/src/modules/orders/api";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
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

function statusColor(status: OrderStatus) {
  if (status === "delivered") return "text-[var(--fs-leaf)]";
  if (status === "cancelled") return "text-rose-600";
  return "text-[var(--fs-mango-deep)]";
}

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";
  const orderId = params.id;

  const order = useQuery(() => ordersApi.get(orderId), [orderId]);
  const cancel = useMutation(() => ordersApi.cancel(orderId, "Customer cancelled"));

  if (order.isLoading) {
    return (
      <AccountShell title="Order" subtitle="Loading…">
        <p className="text-sm text-[var(--fs-muted)]">Loading order…</p>
      </AccountShell>
    );
  }

  if (order.error || !order.data) {
    return (
      <AccountShell title="Order not found">
        <p className="text-sm text-rose-600">{order.error?.message ?? "Order not found"}</p>
        <Link href="/account/orders" className="mt-4 inline-block text-[var(--fs-leaf)] hover:underline">
          ← All orders
        </Link>
      </AccountShell>
    );
  }

  const o = order.data;
  const canCancel = !["shipped", "delivered", "cancelled"].includes(o.status);

  return (
    <AccountShell title={o.order_number} subtitle={`Placed ${formatWhen(o.created_at)}`}>
      {justPlaced && (
        <div className="mb-6 rounded-2xl border border-[var(--fs-leaf)]/30 bg-[var(--fs-mist)] px-5 py-4 text-sm">
          <p className="font-semibold text-[var(--fs-leaf-deep)]">Order placed — thank you!</p>
          <p className="mt-1 text-[var(--fs-muted)]">
            We&apos;ll pack your fruit with care. Track status below.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/account/orders"
          className="text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]"
        >
          ← All orders
        </Link>
        <p className={`text-sm font-semibold capitalize ${statusColor(o.status)}`}>
          {orderStatusLabel(o.status)} · {o.payment_status}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-[var(--fs-line)] bg-white">
            <ul className="divide-y divide-[var(--fs-line)]">
              {o.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4 sm:p-5">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)]">
                    {item.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-[var(--fs-muted)]">{item.variant_name}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      {item.quantity} × {formatMoney(item.unit_price)}
                    </p>
                    <p className="font-medium">{formatMoney(item.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {o.cancel_reason && (
            <p className="text-sm text-rose-700">Cancelled: {o.cancel_reason}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-fraunces)] text-lg">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--fs-muted)]">Subtotal</dt>
                <dd>{formatMoney(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--fs-muted)]">Tax</dt>
                <dd>{formatMoney(o.tax_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--fs-muted)]">Shipping</dt>
                <dd>
                  {Number(o.shipping_amount) === 0 ? "Free" : formatMoney(o.shipping_amount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[var(--fs-line)] pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(o.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-fraunces)] text-lg">Deliver to</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--fs-muted)]">
              {[o.shipping_line1, o.shipping_line2, `${o.shipping_city}, ${o.shipping_state} ${o.shipping_postal_code}`]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>

          {canCancel && (
            <button
              type="button"
              disabled={cancel.isLoading}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              onClick={async () => {
                if (!confirm("Cancel this order?")) return;
                try {
                  await cancel.mutate();
                  await order.refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              {cancel.isLoading ? "Cancelling…" : "Cancel order"}
            </button>
          )}
        </div>
      </div>
    </AccountShell>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<p className="p-8 text-sm text-[var(--fs-muted)]">Loading…</p>}>
        <OrderDetailContent />
      </Suspense>
    </RequireAuth>
  );
}
