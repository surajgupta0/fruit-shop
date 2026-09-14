"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid, SkeletonCard } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import {
  catalogApi,
  flattenCategories,
  type ProductListParams,
} from "@/src/modules/catalog/api";

function FilterSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading filters">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="fs-skeleton h-9 w-full !rounded-xl" />
      ))}
    </div>
  );
}

function ShopGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function ShopPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const categoryId = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const featured = searchParams.get("featured") === "1";
  const organic = searchParams.get("organic") === "1";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const qParam = searchParams.get("q") || "";

  const categories = useQuery(() => catalogApi.listCategoryTree(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);
  const flatCats = flattenCategories(categories.data ?? []);
  const activeCategory = flatCats.find((c) => c.id === categoryId);

  const params = useMemo<ProductListParams>(
    () => ({
      page,
      page_size: 12,
      search: qParam.trim() || undefined,
      category_id: categoryId || undefined,
      tag: tag || undefined,
      featured: featured || undefined,
      organic: organic || undefined,
    }),
    [page, qParam, categoryId, tag, featured, organic],
  );

  const list = useQuery(() => catalogApi.listProducts(params), [params]);
  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;
  const hasFilters = Boolean(categoryId || tag || featured || organic || qParam);
  const showProductLoader = list.isLoading;

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

  const activeTagName = tags.data?.find((t) => t.slug === tag)?.name;

  return (
    <div className="min-h-[70vh]">
      {/* Page header */}
      <div className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="fs-eyebrow">Browse</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="fs-section-title text-3xl sm:text-4xl">
                {activeCategory?.name || (featured ? "Featured fruit" : organic ? "Organic picks" : "Shop")}
              </h1>
              <p className="mt-2 max-w-lg text-sm font-medium text-[var(--fs-muted)]">
                {activeCategory?.description ||
                  "Fresh fruit, packed after you order. Filter by category, tags, or search."}
              </p>
            </div>
            {!showProductLoader && list.data ? (
              <p className="rounded-full bg-[var(--fs-mist)] px-3.5 py-1.5 text-sm font-extrabold text-[var(--fs-accent-deep)]">
                {list.data.total} result{list.data.total === 1 ? "" : "s"}
              </p>
            ) : showProductLoader ? (
              <div className="fs-skeleton h-8 w-24 !rounded-full" />
            ) : null}
          </div>

          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter({ q: search.trim() || null });
            }}
          >
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fs-muted)]">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mangoes, berries, citrus…"
                className="w-full rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-canvas)] py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-[var(--fs-accent)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-accent)]/15"
              />
            </div>
            <button type="submit" className="fs-btn-primary !rounded-2xl !px-5">
              Search
            </button>
          </form>

          {/* Quick chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter({ featured: featured ? null : "1", organic: null })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                featured
                  ? "bg-[var(--fs-accent)] text-white"
                  : "bg-white ring-1 ring-[var(--fs-line)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
              }`}
            >
              Featured
            </button>
            <button
              type="button"
              onClick={() => setFilter({ organic: organic ? null : "1", featured: null })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                organic
                  ? "bg-[var(--fs-accent)] text-white"
                  : "bg-white ring-1 ring-[var(--fs-line)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
              }`}
            >
              Organic
            </button>
            {categories.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="fs-skeleton h-8 w-20 !rounded-full" />
                ))
              : flatCats.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setFilter({ category: categoryId === c.id ? null : c.id })
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                      categoryId === c.id
                        ? "bg-[var(--fs-ink)] text-white"
                        : "bg-white ring-1 ring-[var(--fs-line)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Active filters */}
        {hasFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
              Filters
            </span>
            {qParam ? (
              <FilterChip label={`“${qParam}”`} onClear={() => setFilter({ q: null })} />
            ) : null}
            {activeCategory ? (
              <FilterChip
                label={activeCategory.name}
                onClear={() => setFilter({ category: null })}
              />
            ) : null}
            {activeTagName ? (
              <FilterChip label={activeTagName} onClear={() => setFilter({ tag: null })} />
            ) : null}
            {featured ? (
              <FilterChip label="Featured" onClear={() => setFilter({ featured: null })} />
            ) : null}
            {organic ? (
              <FilterChip label="Organic" onClear={() => setFilter({ organic: null })} />
            ) : null}
            <Link
              href="/shop"
              className="ml-1 text-sm font-bold text-[var(--fs-accent)] hover:underline"
            >
              Clear all
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-56">
            <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-4 shadow-[var(--fs-shadow-sm)] lg:sticky lg:top-24">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
                Categories
              </p>
              {categories.isLoading ? (
                <div className="mt-3">
                  <FilterSkeleton />
                </div>
              ) : (
                <ul className="mt-3 space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setFilter({ category: null })}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                        !categoryId
                          ? "bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]"
                          : "text-[var(--fs-muted)] hover:bg-[var(--fs-canvas)] hover:text-[var(--fs-ink)]"
                      }`}
                    >
                      All fruit
                    </button>
                  </li>
                  {flatCats.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setFilter({ category: c.id })}
                        className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                          categoryId === c.id
                            ? "bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]"
                            : "text-[var(--fs-muted)] hover:bg-[var(--fs-canvas)] hover:text-[var(--fs-ink)]"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-[var(--fs-line)] pt-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
                  Tags
                </p>
                {tags.isLoading ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="fs-skeleton h-7 w-16 !rounded-full" />
                    ))}
                  </div>
                ) : (tags.data?.length ?? 0) > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilter({ tag: null })}
                      className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        !tag
                          ? "bg-[var(--fs-ink)] text-white"
                          : "bg-[var(--fs-canvas)] text-[var(--fs-muted)] ring-1 ring-[var(--fs-line)]"
                      }`}
                    >
                      Any
                    </button>
                    {tags.data!.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFilter({ tag: t.slug })}
                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          tag === t.slug
                            ? "bg-[var(--fs-accent)] text-white"
                            : "bg-[var(--fs-canvas)] text-[var(--fs-muted)] ring-1 ring-[var(--fs-line)] hover:text-[var(--fs-ink)]"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-[var(--fs-muted)]">No tags yet</p>
                )}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1">
            {list.error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                {list.error.message}
              </div>
            )}

            {showProductLoader ? (
              <ShopGridSkeleton count={9} />
            ) : list.data ? (
              <>
                <ProductGrid
                  products={list.data.items}
                  empty={
                    hasFilters
                      ? "No fruit matches these filters. Try clearing a filter or searching something else."
                      : "No products in the shop yet. Check back soon."
                  }
                  columns={3}
                />

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--fs-line)] bg-white px-4 py-3 shadow-[var(--fs-shadow-sm)]">
                    <p className="text-sm font-semibold text-[var(--fs-muted)]">
                      Page <span className="text-[var(--fs-ink)]">{page}</span> of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        className="rounded-xl border border-[var(--fs-line)] bg-white px-4 py-2 text-sm font-bold text-[var(--fs-ink)] transition hover:bg-[var(--fs-mist)] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setFilter({ page: String(page - 1) })}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        className="rounded-xl bg-[var(--fs-accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--fs-accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setFilter({ page: String(page + 1) })}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--fs-mist)] px-3 py-1.5 text-xs font-extrabold text-[var(--fs-accent-deep)] transition hover:bg-[#ffe0c8]"
    >
      {label}
      <span className="text-[var(--fs-muted)]" aria-hidden>
        ×
      </span>
    </button>
  );
}

function ShopPageFallback() {
  return (
    <div className="min-h-[70vh]">
      <div className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="fs-skeleton mb-2 h-3 w-16" />
          <div className="fs-skeleton h-10 w-48" />
          <div className="fs-skeleton mt-3 h-4 w-80 max-w-full" />
          <div className="fs-skeleton mt-6 h-12 w-full !rounded-2xl" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="fs-skeleton h-8 w-20 !rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-4">
              <FilterSkeleton />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <ShopGridSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <StoreShell>
      <Suspense fallback={<ShopPageFallback />}>
        <ShopPanel />
      </Suspense>
    </StoreShell>
  );
}
