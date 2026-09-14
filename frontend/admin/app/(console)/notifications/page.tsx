"use client";

import { useMemo, useState } from "react";
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
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
} from "@/src/console/ui";
import { notificationsApi } from "@/src/modules/notifications/api";

function statusTone(status: string) {
  if (status === "sent") return "ok" as const;
  if (status === "failed") return "danger" as const;
  return "neutral" as const;
}

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
    <ConsolePage width="wide">
      <PageHeader
        eyebrow="Commerce"
        title="Notifications"
        description="Email and SMS delivery log for order status updates."
      />

      <Toolbar>
        <Input
          type="search"
          placeholder="Filter by order id…"
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[240px] sm:flex-1"
        />
        {orderId && (
          <Btn
            variant="ghost"
            className="!py-2"
            onClick={() => {
              setOrderId("");
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
            title="No notifications yet"
            body={
              orderId
                ? "No delivery logs match that order id."
                : "Logs appear when orders change status."
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Event</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Sent</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((row) => (
                    <tr key={row.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="font-extrabold capitalize">
                          {row.event.replaceAll("_", " ")}
                        </p>
                        {row.order_id && (
                          <p className="mt-0.5 font-mono text-[11px] font-medium text-[var(--fs-muted)]">
                            {row.order_id.slice(0, 8)}…
                          </p>
                        )}
                        {row.error && (
                          <p className="mt-1 text-xs font-semibold text-[var(--fs-danger)]">
                            {row.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-lg bg-[var(--fs-canvas)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
                          {row.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium">{row.recipient}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={statusTone(row.status)}>{row.status}</StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-[var(--fs-muted)]">
                        {formatWhen(row.sent_at)}
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

export default function NotificationsPage() {
  return (
    <RequirePermission permission={P.NOTIFICATIONS_READ}>
      <NotificationsPanel />
    </RequirePermission>
  );
}
