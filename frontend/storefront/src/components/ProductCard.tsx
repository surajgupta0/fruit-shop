"use client";

import Link from "next/link";

import { priceLabel, type ProductSummary } from "@/src/modules/catalog/api";

const TILE_TONES = [
  "from-[#ffedd5] to-[#fff7ed]",
  "from-[#fce7f3] to-[#fff1f2]",
  "from-[#e0f2fe] to-[#f0f9ff]",
  "from-[#fef9c3] to-[#fffbeb]",
  "from-[#d1fae5] to-[#ecfdf5]",
  "from-[#ede9fe] to-[#f5f3ff]",
] as const;

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 97;
  return TILE_TONES[hash % TILE_TONES.length];
}

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--fs-shadow)] hover:ring-[var(--fs-leaf)]/35"
    >
      <div
        className={`relative aspect-[5/4] overflow-hidden bg-gradient-to-br ${toneFor(product.name)}`}
      >
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--fs-leaf)]/30">
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.is_organic && (
            <span className="rounded-full bg-[var(--fs-mint)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Organic
            </span>
          )}
          {product.badge_label && (
            <span className="rounded-full bg-[var(--fs-berry)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              {product.badge_label}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--fs-leaf)]">
          {product.category_name || product.brand_name || "Fresh fruit"}
        </p>
        <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-[var(--fs-ink)] transition group-hover:text-[var(--fs-leaf-deep)]">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-[var(--fs-muted)]">
            {product.short_description}
          </p>
        )}
        <p className="mt-auto pt-3 text-base font-extrabold text-[var(--fs-ink)]">
          {priceLabel(product)}
          {product.in_stock === false ? (
            <span className="ml-2 text-xs font-semibold text-[var(--fs-muted)]">Sold out</span>
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
      <p className="rounded-[1.35rem] border border-dashed border-[var(--fs-line)] bg-white/80 px-6 py-16 text-center text-sm font-medium text-[var(--fs-muted)]">
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

const CAT_ACCENTS = [
  "bg-[#ff5a36]",
  "bg-[#fb8500]",
  "bg-[#e63956]",
  "bg-[#2ec4b6]",
  "bg-[#4cc9f0]",
  "bg-[#7b5cff]",
] as const;

export function CategoryTile({
  href,
  name,
  imageUrl,
  description,
  index = 0,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
  index?: number;
}) {
  const accent = CAT_ACCENTS[index % CAT_ACCENTS.length];
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[1.5rem] bg-white shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--fs-shadow)]"
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 ${accent} opacity-90`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {name}
          </p>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{description}</p>
          )}
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-[var(--fs-citrus)]">
            Shop now
            <span aria-hidden>→</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export function CategoryChip({
  href,
  name,
  index = 0,
}: {
  href: string;
  name: string;
  index?: number;
}) {
  const accents = [
    "bg-[#ffe8e0] text-[#c2410c] ring-[#ffd4c4]",
    "bg-[#fff3d6] text-[#b45309] ring-[#ffe6a8]",
    "bg-[#fde2e8] text-[#be123c] ring-[#fbcfe0]",
    "bg-[#d9f7f3] text-[#0f766e] ring-[#99f6e4]",
    "bg-[#e0f4ff] text-[#0369a1] ring-[#bae6fd]",
    "bg-[#eee8ff] text-[#5b21b6] ring-[#ddd6fe]",
  ];
  const tone = accents[index % accents.length];
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}
    >
      {name}
    </Link>
  );
}
