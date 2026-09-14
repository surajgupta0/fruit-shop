"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid, ProductSkeletonGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

function CollectionSkeleton() {
  return (
    <div role="status" aria-label="Loading category">
      <div className="fs-skeleton h-3 w-16" />
      <div className="fs-skeleton mt-2 h-10 w-56" />
      <div className="fs-skeleton mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8">
        <ProductSkeletonGrid count={8} />
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const categories = useQuery(() => catalogApi.listCategoryTree(), []);
  const category = flattenCategories(categories.data ?? []).find((c) => c.slug === slug);

  const products = useQuery(
    () => catalogApi.listProducts({ category_id: category!.id, page_size: 24 }),
    [category?.id],
    { enabled: Boolean(category?.id) },
  );

  return (
    <StoreShell>
      <div className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/shop"
            className="text-sm font-bold text-[var(--fs-muted)] hover:text-[var(--fs-accent)]"
          >
            ← Shop
          </Link>

          {categories.isLoading && (
            <div className="mt-6">
              <div className="fs-skeleton h-3 w-20" />
              <div className="fs-skeleton mt-2 h-10 w-52" />
              <div className="fs-skeleton mt-3 h-4 w-72 max-w-full" />
            </div>
          )}

          {!categories.isLoading && !category && (
            <div className="mt-6">
              <p className="fs-eyebrow">Category</p>
              <h1 className="fs-section-title mt-1 text-3xl">Category not found</h1>
              <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
                This collection may have moved or been removed.
              </p>
              <Link href="/shop" className="fs-btn-primary mt-6 inline-flex !py-2.5">
                Browse all fruit
              </Link>
            </div>
          )}

          {category && (
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="fs-eyebrow">Category</p>
                <h1 className="fs-section-title mt-1 text-3xl sm:text-4xl">{category.name}</h1>
                {category.description ? (
                  <p className="mt-2 max-w-xl text-sm font-medium text-[var(--fs-muted)]">
                    {category.description}
                  </p>
                ) : (
                  <p className="mt-2 max-w-xl text-sm font-medium text-[var(--fs-muted)]">
                    Fresh picks from {category.name}.
                  </p>
                )}
              </div>
              {!products.isLoading && products.data ? (
                <p className="rounded-full bg-[var(--fs-mist)] px-3.5 py-1.5 text-sm font-extrabold text-[var(--fs-accent-deep)]">
                  {products.data.total} result{products.data.total === 1 ? "" : "s"}
                </p>
              ) : products.isLoading ? (
                <div className="fs-skeleton h-8 w-24 !rounded-full" />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {categories.isLoading && <CollectionSkeleton />}

        {category && (
          <>
            {products.isLoading && <ProductSkeletonGrid count={8} />}
            {products.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                {products.error.message}
              </div>
            )}
            {products.data && (
              <ProductGrid
                products={products.data.items}
                empty={`No fruit in ${category.name} yet.`}
              />
            )}
            {products.data && products.data.total > 0 && (
              <div className="mt-8 text-center">
                <Link
                  href={`/shop?category=${category.id}`}
                  className="text-sm font-bold text-[var(--fs-accent)] hover:underline"
                >
                  Open in shop with filters →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </StoreShell>
  );
}
