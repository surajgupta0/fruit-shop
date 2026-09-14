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
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
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
    <ConsolePage>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Create and publish fruit listings — status, price, and media."
        actions={
          <Link href="/products/new">
            <Btn>New product</Btn>
          </Link>
        }
      />

      <Toolbar>
        <Input
          type="search"
          placeholder="Search by name or slug…"
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
            setStatus(e.target.value);
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
        {(search || status) && (
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
            title="No products match"
            body={
              search || status
                ? "Try clearing filters or search for a different name."
                : "Create your first fruit listing to start selling."
            }
            action={
              <Link href="/products/new">
                <Btn>New product</Btn>
              </Link>
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((p) => (
                    <tr key={p.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-[var(--fs-mist)]">
                            {p.primary_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.primary_image_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="grid size-full place-items-center text-sm font-extrabold text-[var(--fs-accent)]/35">
                                {p.name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/products/${p.id}`}
                              className="font-extrabold text-[var(--fs-ink)] hover:text-[var(--fs-accent-deep)]"
                            >
                              {p.name}
                            </Link>
                            <p className="truncate text-xs font-medium text-[var(--fs-muted)]">
                              {p.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--fs-muted)]">
                        {p.category_name || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold tabular-nums">
                        {formatPrice(p.min_price)}
                        {p.max_price && p.max_price !== p.min_price
                          ? ` – ${formatPrice(p.max_price)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--fs-muted)]">
                        {p.total_stock != null ? p.total_stock : "—"}
                        {p.in_stock === false ? (
                          <span className="ml-1 text-xs font-bold text-rose-600">out</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={statusTone(p.status)}>{p.status}</StatusPill>
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

export default function ProductsPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <Suspense fallback={<ConsolePage><TableSkeleton rows={8} /></ConsolePage>}>
        <ProductsPanel />
      </Suspense>
    </RequirePermission>
  );
}
