"use client";

import Link from "next/link";

import { priceLabel, type ProductSummary } from "@/src/modules/catalog/api";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--fs-radius)] bg-white shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--fs-shadow)] hover:ring-[var(--fs-mango)]/35"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-[var(--fs-mist)]">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--fs-mango)]/30">
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.is_organic && (
            <span className="rounded-full bg-[var(--fs-leaf)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Organic
            </span>
          )}
          {product.badge_label && (
            <span className="rounded-full bg-[var(--fs-mango)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {product.badge_label}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fs-mango-deep)]">
          {product.category_name || product.brand_name || "Fresh fruit"}
        </p>
        <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-bold leading-snug tracking-tight text-[var(--fs-ink)] transition group-hover:text-[var(--fs-leaf-deep)]">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-[var(--fs-muted)]">
            {product.short_description}
          </p>
        )}
        <p className="mt-auto pt-3 text-base font-bold text-[var(--fs-ink)]">
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
      <p className="rounded-[var(--fs-radius)] border border-dashed border-[var(--fs-line)] bg-white px-6 py-16 text-center text-sm text-[var(--fs-muted)]">
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

/** Pluckk-style round category explorer */
export function CategoryCircle({
  href,
  name,
  imageUrl,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
}) {
  return (
    <Link href={href} className="group flex w-[6.5rem] shrink-0 flex-col items-center gap-2.5 sm:w-28">
      <span className="relative block size-[5.5rem] overflow-hidden rounded-full bg-[var(--fs-mist)] ring-2 ring-[var(--fs-line)] shadow-[var(--fs-shadow-sm)] transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--fs-mango)] sm:size-28">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full place-items-center bg-[linear-gradient(145deg,var(--fs-leaf),var(--fs-leaf-deep))] font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            {name.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-center text-xs font-semibold text-[var(--fs-ink)] sm:text-sm">
        {name}
      </span>
    </Link>
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
      className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--fs-radius)] bg-[var(--fs-mist)] shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--fs-shadow)]"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--fs-leaf-deep),var(--fs-leaf))]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
          {name}
        </p>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-white/75 sm:text-sm">{description}</p>
        )}
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--fs-citrus)]">
          Shop now →
        </p>
      </div>
    </Link>
  );
}

export function CategoryChip({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-[var(--fs-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--fs-ink)] shadow-sm transition hover:border-[var(--fs-mango)]/40 hover:bg-[var(--fs-mist)]"
    >
      {name}
    </Link>
  );
}
