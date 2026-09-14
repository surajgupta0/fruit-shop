"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  ErrorLine,
  Field,
  LoadingLine,
  PageHeader,
  SectionLabel,
  Select,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import {
  formatAddress,
  formatMoney,
  ORDER_STATUSES,
  orderStatusTone,
  ordersApi,
  paymentStatusTone,
  type OrderStatus,
  type PaymentStatus,
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

function OrderDetailPanel({ orderId }: { orderId: string }) {
  const order = useQuery(() => ordersApi.get(orderId), [orderId]);
  const payment = useQuery(() => ordersApi.getPayment(orderId), [orderId], {
    enabled: Boolean(order.data),
  });

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatus | "">("");

  const save = useMutation(() =>
    ordersApi.update(orderId, {
      status: nextStatus || undefined,
      payment_status: nextPaymentStatus || undefined,
    }),
  );
  const refund = useMutation(() => ordersApi.refund(orderId, "Admin refund"));

  if (order.isLoading) {
    return <LoadingLine label="Loading order…" />;
  }
  if (order.error || !order.data) {
    return (
      <div className="space-y-3">
        <ErrorLine message={order.error?.message ?? "Order not found"} />
        <Link href="/orders" className="text-sm text-[var(--fs-leaf)] hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const o = order.data;
  const currentStatus = nextStatus || o.status;
  const currentPayment = nextPaymentStatus || o.payment_status;
  const canRefund = payment.data?.status === "paid" && o.status !== "cancelled";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/orders"
            className="mb-2 inline-block text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]"
          >
            ← Orders
          </Link>
        }
        title={o.order_number}
        description={`Placed ${formatWhen(o.created_at)} · ${o.customer_name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={orderStatusTone(o.status)}>{o.status}</StatusPill>
            <StatusPill tone={paymentStatusTone(o.payment_status)}>
              {o.payment_status} · {o.payment_method}
            </StatusPill>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Surface padded>
            <SectionLabel>Line items</SectionLabel>
            <ul className="divide-y divide-[var(--fs-line)]">
              {o.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
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
                    <p className="font-medium text-[var(--fs-ink)]">{item.product_name}</p>
                    <p className="text-sm text-[var(--fs-muted)]">
                      {item.variant_name}
                      {item.unit_label ? ` · ${item.unit_label}` : ""}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--fs-muted)]">{item.sku}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {item.quantity} × {formatMoney(item.unit_price)}
                    </p>
                    <p className="text-[var(--fs-muted)]">{formatMoney(item.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Surface>

          {(o.notes || o.cancel_reason) && (
            <Surface padded>
              <SectionLabel>Notes</SectionLabel>
              {o.notes && <p className="text-sm text-[var(--fs-ink)]">{o.notes}</p>}
              {o.cancel_reason && (
                <p className="mt-2 text-sm text-rose-700">
                  Cancelled: {o.cancel_reason}
                  {o.cancelled_at ? ` · ${formatWhen(o.cancelled_at)}` : ""}
                </p>
              )}
            </Surface>
          )}
        </div>

        <div className="space-y-5">
          <Surface padded>
            <SectionLabel>Totals</SectionLabel>
            <dl className="space-y-2 text-sm">
              {[
                ["Subtotal", o.subtotal],
                ["Tax", o.tax_amount],
                ["Shipping", o.shipping_amount],
                ...(Number(o.discount_amount) > 0
                  ? [
                      [
                        o.coupon_code ? `Discount (${o.coupon_code})` : "Discount",
                        `−${formatMoney(o.discount_amount)}`,
                      ],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-[var(--fs-muted)]">{label}</dt>
                  <dd>{typeof value === "string" ? value : formatMoney(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-[var(--fs-line)] pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(o.total)}</dd>
              </div>
            </dl>
          </Surface>

          <Surface padded>
            <SectionLabel>Customer</SectionLabel>
            <p className="font-medium">{o.customer_name}</p>
            <p className="text-sm text-[var(--fs-muted)]">{o.customer_phone}</p>
            {o.customer_email && (
              <p className="text-sm text-[var(--fs-muted)]">{o.customer_email}</p>
            )}
          </Surface>

          <Surface padded>
            <SectionLabel>Ship to</SectionLabel>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fs-muted)]">
              {o.shipping_label}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
              {formatAddress(o)}
            </p>
          </Surface>

          {payment.data && (
            <Surface padded>
              <SectionLabel>Payment record</SectionLabel>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Amount</dt>
                  <dd>{formatMoney(payment.data.amount)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Provider</dt>
                  <dd>{payment.data.provider || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Reference</dt>
                  <dd className="truncate font-mono text-xs">
                    {payment.data.provider_reference || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--fs-muted)]">Paid at</dt>
                  <dd>{formatWhen(payment.data.paid_at)}</dd>
                </div>
              </dl>
            </Surface>
          )}

          <Surface padded>
            <SectionLabel>Fulfilment</SectionLabel>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nextStatus && !nextPaymentStatus) return;
                try {
                  await save.mutate();
                  setNextStatus("");
                  setNextPaymentStatus("");
                  await order.refetch();
                  await payment.refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              <Field label="Order status">
                <Select
                  value={currentStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Payment status">
                <Select
                  value={currentPayment}
                  onChange={(e) => setNextPaymentStatus(e.target.value as PaymentStatus)}
                >
                  {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Btn
                type="submit"
                className="w-full"
                disabled={
                  save.isLoading ||
                  (currentStatus === o.status && currentPayment === o.payment_status)
                }
              >
                {save.isLoading ? "Saving…" : "Update order"}
              </Btn>
            </form>

            {canRefund && (
              <Btn
                variant="danger"
                className="mt-3 w-full"
                disabled={refund.isLoading}
                onClick={async () => {
                  if (!confirm("Refund this payment and cancel the order?")) return;
                  try {
                    await refund.mutate();
                    await order.refetch();
                    await payment.refetch();
                  } catch {
                    /* toast */
                  }
                }}
              >
                {refund.isLoading ? "Refunding…" : "Refund payment"}
              </Btn>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = typeof params.id === "string" ? params.id : "";

  return (
    <RequirePermission permission={P.ORDERS_MANAGE}>
      {orderId ? <OrderDetailPanel orderId={orderId} /> : <ErrorLine message="Invalid order" />}
    </RequirePermission>
  );
}
