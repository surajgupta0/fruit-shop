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
  Select,
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
} from "@/src/console/ui";
import {
  reviewsApi,
  reviewStatusTone,
  type ReviewStatus,
} from "@/src/modules/reviews/api";

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

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums font-extrabold text-[var(--fs-accent-deep)]">
      {"★".repeat(rating)}
      <span className="text-[var(--fs-line)]">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function ReviewsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      status,
      search: search.trim() || undefined,
    }),
    [page, status, search],
  );

  const list = useQuery(() => reviewsApi.list(params), [params]);
  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;
  const hasFilters = Boolean(status || search);

  return (
    <ConsolePage width="wide">
      <PageHeader
        eyebrow="Commerce"
        title="Reviews"
        description="Moderate customer ratings — approve, hide, or remove."
      />

      <Toolbar>
        <Input
          type="search"
          placeholder="Search author, title, or body…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[220px] sm:flex-1"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReviewStatus | "");
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden</option>
        </Select>
        {hasFilters && (
          <Btn
            variant="ghost"
            className="!py-2"
            onClick={() => {
              setSearch("");
              setStatus("");
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
            title="No reviews found"
            body={
              hasFilters
                ? "Try clearing filters or a different search."
                : "Reviews appear after customers rate delivered products."
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Product</th>
                    <th className="px-4 py-3">Review</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((row) => (
                    <tr key={row.id} className="align-top transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="font-extrabold text-[var(--fs-ink)]">
                          {row.product_name || "Product"}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-[var(--fs-muted)]">
                          {row.author_name || "Customer"}
                          {row.is_verified_purchase ? " · Verified" : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-[var(--fs-muted)]">
                          {formatWhen(row.created_at)}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        {row.title ? (
                          <p className="font-bold text-[var(--fs-ink)]">{row.title}</p>
                        ) : null}
                        <p className="mt-0.5 line-clamp-3 text-sm font-medium text-[var(--fs-muted)]">
                          {row.body || "—"}
                        </p>
                        {row.admin_note ? (
                          <p className="mt-1 text-xs font-semibold text-[var(--fs-warn)]">
                            Note: {row.admin_note}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <Stars rating={row.rating} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={reviewStatusTone(String(row.status))}>
                          {row.status}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {row.status !== "approved" && (
                            <button
                              type="button"
                              className="text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                              onClick={async () => {
                                try {
                                  await reviewsApi.moderate(row.id, { status: "approved" });
                                  await list.refetch();
                                } catch {
                                  /* toast */
                                }
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {row.status !== "hidden" && (
                            <button
                              type="button"
                              className="text-xs font-extrabold text-[var(--fs-muted)] hover:underline"
                              onClick={async () => {
                                try {
                                  await reviewsApi.moderate(row.id, {
                                    status: "hidden",
                                    admin_note: "Hidden by staff",
                                  });
                                  await list.refetch();
                                } catch {
                                  /* toast */
                                }
                              }}
                            >
                              Hide
                            </button>
                          )}
                          {row.status !== "rejected" && (
                            <button
                              type="button"
                              className="text-xs font-extrabold text-[var(--fs-warn)] hover:underline"
                              onClick={async () => {
                                try {
                                  await reviewsApi.moderate(row.id, {
                                    status: "rejected",
                                    admin_note: "Rejected by staff",
                                  });
                                  await list.refetch();
                                } catch {
                                  /* toast */
                                }
                              }}
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                            onClick={async () => {
                              if (!confirm("Permanently delete this review?")) return;
                              try {
                                await reviewsApi.delete(row.id);
                                await list.refetch();
                              } catch {
                                /* toast */
                              }
                            }}
                          >
                            Delete
                          </button>
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

export default function ReviewsPage() {
  return (
    <RequirePermission permission={P.REVIEWS_MANAGE}>
      <ReviewsPanel />
    </RequirePermission>
  );
}
