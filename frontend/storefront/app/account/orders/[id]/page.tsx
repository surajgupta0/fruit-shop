"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import {
  AccountCard,
  AccountLoader,
  AccountSectionTitle,
  AccountShell,
  StatusBadge,
} from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import {
  formatMoney,
  orderStatusLabel,
  ordersApi,
  type OrderStatus,
} from "@/src/modules/orders/api";

const FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

function formatWhen(iso: string | null | undefined) {
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

function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        This order was cancelled
      </div>
    );
  }

  const idx = FLOW.indexOf(status);

  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {FLOW.map((step, i) => {
        const done = idx >= i;
        const current = idx === i;
        return (
          <li
            key={step}
            className={`rounded-xl px-2 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wide sm:text-xs ${
              current
                ? "bg-[var(--fs-accent)] text-white shadow-sm"
                : done
                  ? "bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]"
                  : "bg-stone-50 text-[var(--fs-muted)]"
            }`}
          >
            {orderStatusLabel(step)}
          </li>
        );
      })}
    </ol>
  );
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
      <AccountShell title="Order" subtitle="Fetching details…">
        <AccountCard>
          <AccountLoader label="Loading order…" />
        </AccountCard>
      </AccountShell>
    );
  }

  if (order.error || !order.data) {
    return (
      <AccountShell title="Order not found">
        <AccountCard>
          <p className="text-sm font-semibold text-rose-600">
            {order.error?.message ?? "We couldn’t find this order."}
          </p>
          <Link
            href="/account/orders"
            className="mt-4 inline-block text-sm font-bold text-[var(--fs-accent)] hover:underline"
          >
            ← Back to orders
          </Link>
        </AccountCard>
      </AccountShell>
    );
  }

  const o = order.data;
  const canCancel = o.can_cancel ?? !["shipped", "delivered", "cancelled"].includes(o.status);
  const timeline = o.timeline ?? [];

  return (
    <AccountShell
      title={o.order_number}
      subtitle={`Placed ${formatWhen(o.created_at)}`}
      actions={<StatusBadge status={o.status} />}
    >
      {justPlaced && (
        <div className="mb-6 rounded-2xl border border-[var(--fs-accent)]/25 bg-[var(--fs-mist)] px-5 py-4">
          <p className="font-extrabold text-[var(--fs-accent-deep)]">Order placed — thank you!</p>
          <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">
            We’ll pack your fruit with care. Track progress below.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/account/orders"
          className="text-sm font-bold text-[var(--fs-muted)] hover:text-[var(--fs-accent)]"
        >
          ← All orders
        </Link>
        <p className="text-sm font-semibold capitalize text-[var(--fs-muted)]">
          Payment · {o.payment_status}
        </p>
      </div>

      <AccountCard className="mb-6">
        <AccountSectionTitle title="Progress" />
        <StatusStepper status={o.status} />
        {timeline.length > 0 && (
          <ul className="mt-5 space-y-2.5 border-t border-[var(--fs-line)] pt-4">
            {[...timeline].reverse().map((event) => (
              <li key={event.id} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-bold capitalize text-[var(--fs-ink)]">
                    {event.to_status}
                  </span>
                  {event.note ? (
                    <span className="font-medium text-[var(--fs-muted)]"> — {event.note}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-[var(--fs-muted)]">
                  {formatWhen(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AccountCard>

      {(o.tracking_number || o.carrier) && (
        <AccountCard className="mb-6 !border-[var(--fs-accent)]/20 !bg-[var(--fs-mist)]/60">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-accent)]">
            Tracking
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--fs-ink)]">
            {o.carrier ? <span>{o.carrier}</span> : null}
            {o.carrier && o.tracking_number ? " · " : null}
            {o.tracking_number ? (
              <span className="font-mono text-[var(--fs-accent-deep)]">{o.tracking_number}</span>
            ) : null}
          </p>
          {o.shipped_at && (
            <p className="mt-1 text-xs font-medium text-[var(--fs-muted)]">
              Shipped {formatWhen(o.shipped_at)}
            </p>
          )}
        </AccountCard>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AccountCard padded={false}>
            <div className="border-b border-[var(--fs-line)] px-5 py-4">
              <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Items</h2>
            </div>
            <ul className="divide-y divide-[var(--fs-line)]">
              {o.items.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4">
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
                    <p className="font-extrabold text-[var(--fs-ink)]">{item.product_name}</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--fs-muted)]">
                      {item.variant_name}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-[var(--fs-muted)]">
                      {item.quantity} × {formatMoney(item.unit_price)}
                    </p>
                    <p className="mt-0.5 font-extrabold">{formatMoney(item.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </AccountCard>
          {o.cancel_reason && (
            <p className="text-sm font-semibold text-rose-700">
              Cancelled: {o.cancel_reason}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <AccountCard>
            <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-[var(--fs-muted)]">Subtotal</dt>
                <dd className="font-semibold">{formatMoney(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-[var(--fs-muted)]">Tax</dt>
                <dd className="font-semibold">{formatMoney(o.tax_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-[var(--fs-muted)]">Shipping</dt>
                <dd className="font-semibold">
                  {Number(o.shipping_amount) === 0 ? "Free" : formatMoney(o.shipping_amount)}
                </dd>
              </div>
              {Number(o.discount_amount) > 0 && (
                <div className="flex justify-between text-[var(--fs-accent-deep)]">
                  <dt className="font-medium">
                    Discount
                    {o.coupon_code ? ` (${o.coupon_code})` : ""}
                  </dt>
                  <dd className="font-semibold">−{formatMoney(o.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--fs-line)] pt-2.5 text-base font-extrabold">
                <dt>Total</dt>
                <dd>{formatMoney(o.total)}</dd>
              </div>
            </dl>
          </AccountCard>

          <AccountCard>
            <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">Deliver to</h2>
            <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
              {[
                o.shipping_line1,
                o.shipping_line2,
                `${o.shipping_city}, ${o.shipping_state} ${o.shipping_postal_code}`,
              ]
                .filter(Boolean)
                .join("\n")}
            </p>
          </AccountCard>

          {canCancel && (
            <button
              type="button"
              disabled={cancel.isLoading}
              className="w-full rounded-xl border border-rose-200 bg-white py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
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
      <Suspense
        fallback={
          <AccountShell title="Order">
            <AccountCard>
              <AccountLoader />
            </AccountCard>
          </AccountShell>
        }
      >
        <OrderDetailContent />
      </Suspense>
    </RequireAuth>
  );
}
