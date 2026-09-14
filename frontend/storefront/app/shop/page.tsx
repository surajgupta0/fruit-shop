"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import {
  catalogApi,
  flattenCategories,
  type ProductListParams,
} from "@/src/modules/catalog/api";

function ShopPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const categoryId = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const featured = searchParams.get("featured") === "1";
  const organic = searchParams.get("organic") === "1";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const categories = useQuery(() => catalogApi.listCategoryTree(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);
  const flatCats = flattenCategories(categories.data ?? []);

  const params = useMemo<ProductListParams>(
    () => ({
      page,
      page_size: 12,
      search: search.trim() || undefined,
      category_id: categoryId || undefined,
      tag: tag || undefined,
      featured: featured || undefined,
      organic: organic || undefined,
    }),
    [page, search, categoryId, tag, featured, organic],
  );

  const list = useQuery(() => catalogApi.listProducts(params), [params]);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  function setFilter(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    if (!("page" in next)) sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(125deg,#fff0e8_0%,#ffe4ef_45%,#e8f8ff_100%)] px-6 py-8 sm:px-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-leaf)]">
          Catalog
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
          Shop fruit
        </h1>
        <p className="mt-2 max-w-lg text-sm font-medium text-[var(--fs-muted)]">
          Filter by category, tag, organic, or search — find something juicy.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 space-y-5 rounded-[1.25rem] border border-[var(--fs-line)] bg-white p-4 shadow-[var(--fs-shadow-sm)] lg:w-56">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--fs-muted)]">
              Categories
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setFilter({ category: null })}
                  className={`block w-full rounded-xl px-2.5 py-2 text-left font-semibold ${
                    !categoryId
                      ? "bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)]"
                      : "text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]/60"
                  }`}
                >
                  All
                </button>
              </li>
              {flatCats.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setFilter({ category: c.id })}
                    className={`block w-full rounded-xl px-2.5 py-2 text-left font-semibold ${
                      categoryId === c.id
                        ? "bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)]"
                        : "text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]/60"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {(tags.data?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--fs-muted)]">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter({ tag: null })}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    !tag
                      ? "bg-[var(--fs-leaf)] text-white"
                      : "bg-white text-[var(--fs-muted)] ring-1 ring-[var(--fs-line)]"
                  }`}
                >
                  Any
                </button>
                {tags.data!.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter({ tag: t.slug })}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      tag === t.slug
                        ? "bg-[var(--fs-berry)] text-white"
                        : "bg-white text-[var(--fs-muted)] ring-1 ring-[var(--fs-line)]"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFilter({ featured: e.target.checked ? "1" : null })}
              />
              Featured only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={organic}
                onChange={(e) => setFilter({ organic: e.target.checked ? "1" : null })}
              />
              Organic only
            </label>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <form
            className="mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter({ q: search.trim() || null });
            }}
          >
            <div className="flex gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mango, cherry, coconut…"
                className="w-full rounded-2xl border border-[var(--fs-line)] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15"
              />
              <button
                type="submit"
                className="rounded-2xl bg-[var(--fs-leaf)] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[var(--fs-leaf-deep)]"
              >
                Search
              </button>
            </div>
          </form>

          {(categoryId || tag || featured || organic || searchParams.get("q")) && (
            <p className="mb-4 text-sm font-medium text-[var(--fs-muted)]">
              Showing filtered results
              {list.data ? ` · ${list.data.total} found` : ""}
              {" · "}
              <Link href="/shop" className="font-bold text-[var(--fs-leaf)] hover:underline">
                Clear filters
              </Link>
            </p>
          )}

          {list.isLoading && <p className="text-sm font-medium text-[var(--fs-muted)]">Loading…</p>}
          {list.error && (
            <p className="rounded-2xl bg-[#fde8ef] px-4 py-3 text-sm font-semibold text-[var(--fs-berry)]">
              {list.error.message}
            </p>
          )}
          {list.data && <ProductGrid products={list.data.items} />}

          {list.data && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm font-medium text-[var(--fs-muted)]">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  className="rounded-xl border border-[var(--fs-line)] bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
                  onClick={() => setFilter({ page: String(page - 1) })}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  className="rounded-xl border border-[var(--fs-line)] bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
                  onClick={() => setFilter({ page: String(page + 1) })}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <StoreShell>
      <Suspense fallback={<p className="p-8 text-sm text-[var(--fs-muted)]">Loading shop…</p>}>
        <ShopPanel />
      </Suspense>
    </StoreShell>
  );
}
