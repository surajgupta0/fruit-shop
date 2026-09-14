"use client";

import { useMemo, useState } from "react";
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
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { notificationsApi } from "@/src/modules/notifications/api";

function statusTone(status: string) {
  if (status === "sent") return "ok" as const;
  if (status === "failed") return "danger" as const;
  return "neutral" as const;
}

function NotificationsPanel() {
  const [page, setPage] = useState(1);
  const [orderId, setOrderId] = useState("");
  const params = useMemo(
    () => ({
      page,
      page_size: 30,
      order_id: orderId.trim() || undefined,
    }),
    [page, orderId],
  );
  const list = useQuery(() => notificationsApi.listLogs(params), [params]);
  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Email and SMS delivery log for order status updates."
      />

      <Input
        type="search"
        placeholder="Filter by order id…"
        value={orderId}
        onChange={(e) => {
          setOrderId(e.target.value);
          setPage(1);
        }}
      />

      <Surface>
        {list.isLoading && <LoadingLine label="Loading logs…" />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No notifications yet" body="Logs appear when orders change status." />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-[0.1em] text-[var(--fs-muted)]">
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.event.replaceAll("_", " ")}</p>
                        {row.order_id && (
                          <p className="font-mono text-[11px] text-[var(--fs-muted)]">
                            {row.order_id.slice(0, 8)}…
                          </p>
                        )}
                        {row.error && (
                          <p className="mt-1 text-xs text-rose-600">{row.error}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 uppercase text-[var(--fs-muted)]">
                        {row.channel}
                      </td>
                      <td className="px-4 py-3">{row.recipient}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={statusTone(row.status)}>{row.status}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-[var(--fs-muted)]">
                        {row.sent_at
                          ? new Date(row.sent_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

export default function NotificationsPage() {
  return (
    <RequirePermission permission={P.NOTIFICATIONS_READ}>
      <NotificationsPanel />
    </RequirePermission>
  );
}
