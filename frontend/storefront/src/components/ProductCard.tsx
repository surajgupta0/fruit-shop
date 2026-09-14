"use client";

import Link from "next/link";

import { priceLabel, type ProductSummary } from "@/src/modules/catalog/api";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(15,61,36,0.06)] ring-1 ring-[var(--fs-line)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,61,36,0.12)] hover:ring-[var(--fs-leaf)]/25"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-[linear-gradient(160deg,#e8f5ec,#fff8ee)]">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center font-[family-name:var(--font-fraunces)] text-5xl text-[var(--fs-leaf)]/25">
            F
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-80" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.is_organic && (
            <span className="rounded-full bg-[var(--fs-leaf-deep)]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              Organic
            </span>
          )}
          {product.badge_label && (
            <span className="rounded-full bg-[var(--fs-mango)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fs-orchard)] shadow-sm">
              {product.badge_label}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fs-leaf)]">
          {product.category_name || product.brand_name || "Fresh fruit"}
        </p>
        <h3 className="mt-1.5 font-[family-name:var(--font-fraunces)] text-lg leading-snug text-[var(--fs-ink)] transition group-hover:text-[var(--fs-leaf-deep)]">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-[var(--fs-muted)]">
            {product.short_description}
          </p>
        )}
        <p className="mt-auto pt-3 text-sm font-semibold text-[var(--fs-ink)]">
          {priceLabel(product)}
          {product.in_stock === false ? (
            <span className="ml-2 text-xs font-medium text-[var(--fs-muted)]">Out of stock</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  empty = "No fruit matches these filters.",
}: {
  products: ProductSummary[];
  empty?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--fs-line)] bg-white/80 px-6 py-16 text-center text-sm text-[var(--fs-muted)]">
        {empty}
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <li key={p.id} className="h-full">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function CategoryTile({
  href,
  name,
  imageUrl,
  description,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--fs-mist)] shadow-md ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#1a5638,#2f8f4e)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <p className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight sm:text-2xl">
          {name}
        </p>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-white/75 sm:text-sm">{description}</p>
        )}
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--fs-mango)]">
          Shop now →
        </p>
      </div>
    </Link>
  );
}
