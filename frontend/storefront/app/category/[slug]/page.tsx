"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/shop" className="text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]">
          ← Shop
        </Link>

        {categories.isLoading && (
          <p className="mt-6 text-sm text-[var(--fs-muted)]">Loading category…</p>
        )}

        {!categories.isLoading && !category && (
          <div className="mt-8">
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">Category not found</h1>
            <Link href="/shop" className="mt-4 inline-block text-[var(--fs-leaf)] hover:underline">
              Browse all fruit
            </Link>
          </div>
        )}

        {category && (
          <>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-2 max-w-2xl text-sm text-[var(--fs-muted)]">{category.description}</p>
            )}
            <div className="mt-8">
              {products.isLoading && (
                <p className="text-sm text-[var(--fs-muted)]">Loading fruit…</p>
              )}
              {products.error && (
                <p className="text-sm text-rose-600">{products.error.message}</p>
              )}
              {products.data && (
                <ProductGrid
                  products={products.data.items}
                  empty={`No fruit in ${category.name} yet.`}
                />
              )}
            </div>
          </>
        )}
      </div>
    </StoreShell>
  );
}
