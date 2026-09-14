"use client";

import Link from "next/link";

import { formatMoney, priceLabel, type ProductSummary } from "@/src/modules/catalog/api";

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--fs-line)]">
      <div className="fs-skeleton aspect-square" />
      <div className="space-y-2 p-4">
        <div className="fs-skeleton h-3 w-1/3" />
        <div className="fs-skeleton h-4 w-4/5" />
        <div className="fs-skeleton h-4 w-1/4" />
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function CategorySkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fs-skeleton aspect-[5/4]" />
      ))}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
      <span className="text-sm font-semibold text-[var(--fs-muted)]">{label}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)] transition hover:-translate-y-0.5 hover:shadow-[var(--fs-shadow)] hover:ring-[var(--fs-accent)]/30"
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--fs-mist)]">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-3xl font-extrabold text-[var(--fs-accent)]/25">
            {product.name.slice(0, 1)}
          </div>
        )}
        {(product.is_organic || product.badge_label) && (
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {product.is_organic && (
              <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--fs-ink)] shadow-sm">
                Organic
              </span>
            )}
            {product.badge_label && (
              <span className="rounded-full bg-[var(--fs-accent)] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                {product.badge_label}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--fs-accent)]">
          {product.category_name || product.brand_name || "Fruit"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-snug text-[var(--fs-ink)] group-hover:text-[var(--fs-accent-deep)]">
          {product.name}
        </h3>
        {(product.review_count ?? 0) > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[var(--fs-muted)]">
            <span className="text-[var(--fs-accent)]">★</span>
            {Number(product.average_rating ?? 0).toFixed(1)}
            <span className="font-medium">({product.review_count})</span>
          </p>
        )}
        <p className="mt-auto pt-3 text-sm font-extrabold text-[var(--fs-ink)]">
          {formatMoney(product.min_price) ?? priceLabel(product)}
          {product.unit_label ? (
            <span className="ml-1 text-xs font-semibold text-[var(--fs-muted)]">/ {product.unit_label}</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  empty = "No products found.",
  columns = 4,
}: {
  products: ProductSummary[];
  empty?: string;
  /** Desktop column count (2 or 3 useful beside a shop sidebar). */
  columns?: 2 | 3 | 4;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--fs-line)] bg-white px-6 py-16 text-center">
        <p className="text-lg font-extrabold text-[var(--fs-ink)]">Nothing here yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[var(--fs-muted)]">{empty}</p>
        <Link href="/shop" className="fs-btn-primary mt-6 inline-flex !py-2.5">
          Browse all fruit
        </Link>
      </div>
    );
  }

  const colClass =
    columns === 2
      ? "lg:grid-cols-2"
      : columns === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-4";

  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${colClass}`}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function CategoryCard({
  href,
  name,
  image,
}: {
  href: string;
  name: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block aspect-[5/4] overflow-hidden rounded-2xl bg-[var(--fs-mist)] shadow-[var(--fs-shadow-sm)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#4a3728]/70 via-transparent to-transparent" />
      <p className="absolute bottom-3 left-3 right-3 text-base font-extrabold text-white sm:bottom-4 sm:left-4 sm:text-lg">
        {name}
      </p>
    </Link>
  );
}

export function CategoryChip({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-[var(--fs-line)] bg-white px-3.5 py-1.5 text-sm font-bold hover:border-[var(--fs-accent)] hover:bg-[var(--fs-mist)]"
    >
      {name}
    </Link>
  );
}

export function CategoryCircle(props: { href: string; name: string; imageUrl?: string | null }) {
  return (
    <CategoryCard
      href={props.href}
      name={props.name}
      image={
        props.imageUrl ||
        "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80"
      }
    />
  );
}

export function CategoryTile(props: {
  href: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
}) {
  return (
    <CategoryCard
      href={props.href}
      name={props.name}
      image={
        props.imageUrl ||
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80"
      }
    />
  );
}

export function ProductCarousel({ products, empty }: { products: ProductSummary[]; empty?: string }) {
  return <ProductGrid products={products} empty={empty} />;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-xl">
        {eyebrow ? <p className="fs-eyebrow">{eyebrow}</p> : null}
        <h2 className="fs-section-title mt-1 text-2xl sm:text-3xl lg:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
