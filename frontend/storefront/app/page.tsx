"use client";

import Link from "next/link";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { HeroSlider } from "@/src/components/HeroSlider";
import {
  CategoryChip,
  CategoryCircle,
  CategoryTile,
  ProductGrid,
} from "@/src/components/ProductCard";
import { PromoBar, SiteHeader, StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

const PROMISES = [
  {
    title: "Picked for ripeness",
    body: "Fruit that is ready to enjoy — never warehouse-hard.",
  },
  {
    title: "Packed after you order",
    body: "Careful packing so delicate fruit arrives intact.",
  },
  {
    title: "Farm to door care",
    body: "Cold-aware handling from counter to your kitchen.",
  },
  {
    title: "Easy phone checkout",
    body: "OTP login — no passwords, just fresh fruit faster.",
  },
] as const;

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const categories = useQuery(() => catalogApi.listCategoryTree(), []);
  const tags = useQuery(() => catalogApi.listTags(), []);
  const featured = useQuery(() => catalogApi.listProducts({ featured: true, page_size: 6 }), []);
  const organic = useQuery(() => catalogApi.listProducts({ organic: true, page_size: 6 }), []);
  const fresh = useQuery(() => catalogApi.listProducts({ page_size: 9 }), []);

  const flatCats = flattenCategories(categories.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const circleCats = flatCats.slice(0, 8);
  const tileCats = flatCats.slice(0, 6);

  return (
    <StoreShell header="hero">
      <HeroSlider
        topSlot={
          <>
            <PromoBar />
            <SiteHeader variant="hero" />
          </>
        }
      />

      {/* Explore by category — Pluckk-style circles */}
      <section className="border-b border-[var(--fs-line)] bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="fs-eyebrow">Explore</p>
              <h2 className="fs-section-title mt-1 text-2xl sm:text-3xl">Shop by category</h2>
            </div>
            <Link href="/shop" className="text-sm font-bold text-[var(--fs-mango-deep)] hover:underline">
              View all →
            </Link>
          </div>
          {categories.isLoading && (
            <p className="text-sm text-[var(--fs-muted)]">Loading categories…</p>
          )}
          {!categories.isLoading && circleCats.length === 0 && (
            <p className="text-sm text-[var(--fs-muted)]">
              Categories appear here once published in admin.
            </p>
          )}
          <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:flex-wrap sm:justify-start sm:overflow-visible sm:px-0">
            {circleCats.map((c) => (
              <CategoryCircle
                key={c.id}
                href={`/category/${c.slug}`}
                name={c.name}
                imageUrl={c.image_url}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Our promise — Pluckk-style */}
      <section className="bg-[var(--fs-canvas)] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="fs-eyebrow">Our fruit promise</p>
            <h2 className="fs-section-title mt-2 text-3xl sm:text-4xl">
              How we deliver only the best
            </h2>
            <p className="mt-3 text-sm text-[var(--fs-muted)] sm:text-base">
              Quality checks, careful packing, and checkout built for busy fruit lovers.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((item, i) => (
              <div
                key={item.title}
                className="rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-white p-5 shadow-[var(--fs-shadow-sm)]"
              >
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--fs-mango)]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fs-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured banner strip + tiles */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fs-eyebrow">Collections</p>
            <h2 className="fs-section-title mt-1 text-3xl sm:text-4xl">Taste the aisle</h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              Spotless-style browsing — tap a collection and fill your cart.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {tileCats.map((c) => (
            <CategoryTile
              key={c.id}
              href={`/category/${c.slug}`}
              name={c.name}
              imageUrl={c.image_url}
              description={c.description}
            />
          ))}
        </div>
      </section>

      {/* Seasonal promo band */}
      <section className="relative overflow-hidden bg-[var(--fs-orchard)] py-14 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[var(--fs-mango)]/25 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fs-citrus)]">
              This week’s harvest
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
              Seasonal fruit, delivered fresh
            </h2>
            <p className="mt-2 text-sm text-white/70">
              What’s ripe changes every week — shop the current drop before it’s gone.
            </p>
          </div>
          <Link href="/shop" className="fs-btn-primary shrink-0">
            Shop the harvest
          </Link>
        </div>
      </section>

      {/* Tags */}
      {(tags.data?.length ?? 0) > 0 && (
        <section className="border-b border-[var(--fs-line)] bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="fs-eyebrow">Trends</p>
            <h2 className="fs-section-title mt-1 text-3xl">Browse by mood</h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              Organic, imported, gift-ready, bestsellers…
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {tags.data!.map((t) => (
                <CategoryChip key={t.id} href={`/tag/${t.slug}`} name={t.name} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bestsellers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fs-eyebrow">Bestsellers</p>
            <h2 className="fs-section-title mt-1 text-3xl sm:text-4xl">Customer favourites</h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              The fruit people reorder again and again.
            </p>
          </div>
          <Link
            href="/shop?featured=1"
            className="text-sm font-bold text-[var(--fs-mango-deep)] hover:underline"
          >
            See featured →
          </Link>
        </div>
        {featured.isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading…</p>}
        {featured.data && (
          <ProductGrid products={featured.data.items} empty="Featured fruit coming soon." />
        )}
      </section>

      {/* Organic */}
      {(organic.data?.items.length ?? 0) > 0 && (
        <section className="border-y border-[var(--fs-line)] bg-[var(--fs-mist)]/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="fs-eyebrow">Organic</p>
                <h2 className="fs-section-title mt-1 text-3xl">Grown with care</h2>
                <p className="mt-2 text-sm text-[var(--fs-muted)]">
                  Clean picks for mornings that taste like sunshine.
                </p>
              </div>
              <Link href="/shop?organic=1" className="fs-btn-leaf">
                Shop organic
              </Link>
            </div>
            <ProductGrid products={organic.data!.items} />
          </div>
        </section>
      )}

      {/* Fresh */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fs-eyebrow">In stock</p>
            <h2 className="fs-section-title mt-1 text-3xl sm:text-4xl">Fresh & ready</h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">Grab what’s ripe today.</p>
          </div>
          <Link href="/shop" className="text-sm font-bold text-[var(--fs-mango-deep)] hover:underline">
            Full catalog →
          </Link>
        </div>
        {fresh.isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading fruit…</p>}
        {fresh.error && (
          <p className="rounded-[var(--fs-radius)] bg-[var(--fs-danger-bg)] px-4 py-3 text-sm text-[var(--fs-danger)]">
            {fresh.error.message}
          </p>
        )}
        {fresh.data && (
          <ProductGrid
            products={fresh.data.items}
            empty="No fruit published yet — check back soon."
          />
        )}
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-[var(--fs-leaf-deep)] py-16 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-[var(--fs-mango)]/30 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
            Ready for something ripe?
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:text-base">
            Sign in with your phone and keep favourites ready for the next craving.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="fs-btn-primary">
              Start shopping
            </Link>
            {!isAuthenticated && (
              <Link href="/login" className="fs-btn-ghost">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
