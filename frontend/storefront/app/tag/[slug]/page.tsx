"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid, ProductSkeletonGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi } from "@/src/modules/catalog/api";

export default function TagPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const tags = useQuery(() => catalogApi.listTags(), []);
  const tag = (tags.data ?? []).find((t) => t.slug === slug);
  const label = tag?.name ?? slug;

  const products = useQuery(
    () => catalogApi.listProducts({ tag: slug, page_size: 24 }),
    [slug],
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

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="fs-eyebrow">Tag</p>
              {tags.isLoading ? (
                <>
                  <div className="fs-skeleton mt-2 h-10 w-40" />
                  <div className="fs-skeleton mt-3 h-4 w-64 max-w-full" />
                </>
              ) : (
                <>
                  <h1 className="fs-section-title mt-1 text-3xl sm:text-4xl">{label}</h1>
                  <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
                    Fruit tagged “{label}”.
                  </p>
                </>
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

          {(tags.data?.length ?? 0) > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.data!.slice(0, 8).map((t) => (
                <Link
                  key={t.id}
                  href={`/tag/${t.slug}`}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    t.slug === slug
                      ? "bg-[var(--fs-accent)] text-white"
                      : "bg-white ring-1 ring-[var(--fs-line)] text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                  }`}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {products.isLoading && <ProductSkeletonGrid count={8} />}
        {products.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {products.error.message}
          </div>
        )}
        {products.data && (
          <ProductGrid products={products.data.items} empty="Nothing with this tag yet." />
        )}
        {products.data && products.data.total > 0 && (
          <div className="mt-8 text-center">
            <Link
              href={`/shop?tag=${slug}`}
              className="text-sm font-bold text-[var(--fs-accent)] hover:underline"
            >
              Open in shop with filters →
            </Link>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
