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
} from "@/src/console/ui";
import { catalogApi, formatPrice } from "@/src/modules/catalog/api";

function statusTone(status: string) {
  if (status === "active") return "ok" as const;
  if (status === "draft") return "warn" as const;
  return "neutral" as const;
}

function ProductsPanel() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );

  const list = useQuery(() => catalogApi.listProducts(params), [params]);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Products"
        description="Create and publish fruit listings — status, price, and media."
        actions={
          <Link href="/products/new">
            <Btn>New product</Btn>
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px]">
        <Input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <Surface>
        {list.isLoading && <LoadingLine label="Loading products…" />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-[0.1em] text-[var(--fs-muted)]">
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--fs-mist)]/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--fs-mist)]">
                            {p.primary_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.primary_image_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <Link
                              href={`/products/${p.id}`}
                              className="font-medium text-[var(--fs-ink)] hover:text-[var(--fs-accent)]"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs text-[var(--fs-muted)]">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--fs-muted)]">
                        {p.category_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatPrice(p.min_price)}
                        {p.max_price && p.max_price !== p.min_price
                          ? ` – ${formatPrice(p.max_price)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-[var(--fs-muted)]">
                        {p.total_stock != null ? p.total_stock : "—"}
                        {p.in_stock === false ? (
                          <span className="ml-1 text-xs text-rose-600">out</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={statusTone(p.status)}>{p.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data.items.length === 0 && (
              <EmptyState title="No products" body="Create your first fruit listing." />
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

export default function ProductsPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <Suspense fallback={<LoadingLine label="Loading products…" />}>
        <ProductsPanel />
      </Suspense>
    </RequirePermission>
  );
}
