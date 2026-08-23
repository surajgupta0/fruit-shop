"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@fruitshop/web-core";

import { ProductGrid } from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi } from "@/src/modules/catalog/api";

export default function TagPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const tags = useQuery(() => catalogApi.listTags(), []);
  const tag = (tags.data ?? []).find((t) => t.slug === slug);

  const products = useQuery(
    () => catalogApi.listProducts({ tag: slug, page_size: 24 }),
    [slug],
  );

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/shop" className="text-sm text-[var(--fs-muted)] hover:text-[var(--fs-leaf)]">
          ← Shop
        </Link>

        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
          {tag?.name ?? slug}
        </h1>
        <p className="mt-2 text-sm text-[var(--fs-muted)]">Fruit tagged “{tag?.name ?? slug}”.</p>

        <div className="mt-8">
          {products.isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading…</p>}
          {products.error && <p className="text-sm text-rose-600">{products.error.message}</p>}
          {products.data && (
            <ProductGrid
              products={products.data.items}
              empty="Nothing with this tag yet."
            />
          )}
        </div>
      </div>
    </StoreShell>
  );
}
