"use client";

import Link from "next/link";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { CategoryChip, CategoryTile, ProductGrid } from "@/src/components/ProductCard";
import { PromoBar, SiteHeader, StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=2400&q=80";

const FRUIT_TICKER = [
  "Mango",
  "Strawberry",
  "Orange",
  "Apple",
  "Banana",
  "Papaya",
  "Watermelon",
  "Avocado",
  "Kiwi",
  "Cherry",
];

const PROMISES = [
  {
    title: "Picked for joy",
    body: "Ripe, fragrant fruit — ready to eat, not warehouse-hard.",
    tone: "bg-[#fff0e8] text-[#c2410c]",
    blob: "bg-[#ff5a36]/25",
  },
  {
    title: "Packed with care",
    body: "Delicate imports stay protected from farm gate to doorstep.",
    tone: "bg-[#e8f8ff] text-[#0369a1]",
    blob: "bg-[#4cc9f0]/35",
  },
  {
    title: "Happy checkout",
    body: "Phone OTP login — no passwords, just fresh fruit faster.",
    tone: "bg-[#fde8ef] text-[#be123c]",
    blob: "bg-[#e63956]/25",
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
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 6);

  return (
    <StoreShell header="hero">
      {/* Hero — brand-first, full-bleed, colorful */}
      <section className="relative flex min-h-[92dvh] flex-col overflow-hidden text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          className="fs-fade-in pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(42,36,32,0.88)_0%,rgba(232,67,26,0.55)_42%,rgba(255,183,3,0.28)_72%,rgba(42,36,32,0.2)_100%)]"
        />
        <div
          aria-hidden
          className="fs-drift pointer-events-none absolute -right-16 top-28 h-72 w-72 rounded-full bg-[var(--fs-berry)]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="fs-float pointer-events-none absolute bottom-24 left-[8%] h-40 w-40 rounded-full bg-[var(--fs-mango)]/35 blur-3xl"
        />

        <div className="relative z-10 flex min-h-[92dvh] flex-col">
          <PromoBar />
          <SiteHeader variant="hero" />
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-14 pt-10 sm:px-6 sm:pb-20 lg:px-8">
            <p className="fs-rise font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              Fruit Shop
            </p>
            <h1 className="fs-rise-delay mt-5 max-w-lg text-xl font-semibold text-white/95 sm:text-2xl">
              Juicy fruit that feels like sunshine in a box.
            </h1>
            <p className="fs-rise-delay mt-3 max-w-md text-sm font-medium text-white/75 sm:text-base">
              From Alphonso mornings to exotic berry nights — browse, tap, and taste the difference.
            </p>
            <div className="fs-rise-late mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="fs-btn-primary">
                Shop fresh fruit
              </Link>
              {!isAuthenticated ? (
                <Link href="/signup" className="fs-btn-ghost">
                  Create account
                </Link>
              ) : (
                <Link href="/account" className="fs-btn-ghost">
                  Your account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Fruit name ticker — Spotless-style playful strip */}
      <section className="overflow-hidden border-b border-[var(--fs-line)] bg-white py-3">
        <div className="fs-marquee-track gap-8 text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--fs-ink)]">
          {[...FRUIT_TICKER, ...FRUIT_TICKER].map((name, i) => (
            <span key={`${name}-${i}`} className="inline-flex shrink-0 items-center gap-8">
              <span
                className={
                  i % 3 === 0
                    ? "text-[var(--fs-leaf)]"
                    : i % 3 === 1
                      ? "text-[var(--fs-berry)]"
                      : "text-[var(--fs-mango-deep)]"
                }
              >
                {name}
              </span>
              <span aria-hidden className="text-[var(--fs-line)]">
                •
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Promise strip */}
      <section className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          {PROMISES.map((item) => (
            <div
              key={item.title}
              className={`relative overflow-hidden rounded-[1.25rem] px-5 py-5 ${item.tone}`}
            >
              <span
                aria-hidden
                className={`absolute -right-4 -top-4 size-16 rounded-full ${item.blob}`}
              />
              <p className="relative font-[family-name:var(--font-display)] text-xl font-bold">
                {item.title}
              </p>
              <p className="relative mt-1 text-sm font-medium opacity-90">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-leaf)]">
              Explore
            </p>
            <h2 className="fs-section-title mt-1 text-3xl font-extrabold sm:text-4xl">
              Shop by craving
            </h2>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Mangoes, berries, exotics, gifts — tap a category and go.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-extrabold text-[var(--fs-leaf)] hover:underline"
          >
            All fruit →
          </Link>
        </div>
        {categories.isLoading && (
          <p className="text-sm font-medium text-[var(--fs-muted)]">Loading categories…</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {flatCats.map((c, i) => (
            <CategoryTile
              key={c.id}
              href={`/category/${c.slug}`}
              name={c.name}
              imageUrl={c.image_url}
              description={c.description}
              index={i}
            />
          ))}
        </div>
        {!categories.isLoading && flatCats.length === 0 && (
          <p className="text-sm font-medium text-[var(--fs-muted)]">
            Categories appear here once published in admin.
          </p>
        )}
      </section>

      {/* Tags / trends */}
      {(tags.data?.length ?? 0) > 0 && (
        <section className="bg-[linear-gradient(135deg,#fff1e8_0%,#ffe4ef_50%,#e8f8ff_100%)] py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-berry)]">
              Trends
            </p>
            <h2 className="fs-section-title mt-1 text-3xl font-extrabold">Browse by mood</h2>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Organic, imported, gift-ready, bestsellers…
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {tags.data!.map((t, i) => (
                <CategoryChip key={t.id} href={`/tag/${t.slug}`} name={t.name} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-mango-deep)]">
              Bestsellers
            </p>
            <h2 className="fs-section-title mt-1 text-3xl font-extrabold sm:text-4xl">
              Customer favourites
            </h2>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              The fruit people reorder again and again.
            </p>
          </div>
          <Link
            href="/shop?featured=1"
            className="text-sm font-extrabold text-[var(--fs-leaf)] hover:underline"
          >
            See featured →
          </Link>
        </div>
        {featured.isLoading && (
          <p className="text-sm font-medium text-[var(--fs-muted)]">Loading…</p>
        )}
        {featured.data && (
          <ProductGrid products={featured.data.items} empty="Featured fruit coming soon." />
        )}
      </section>

      {/* Seasonal / organic banner band */}
      {(organic.data?.items.length ?? 0) > 0 && (
        <section className="relative overflow-hidden py-14">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(120deg,#2ec4b6_0%,#4cc9f0_45%,#7b5cff_100%)]"
          />
          <div
            aria-hidden
            className="fs-drift absolute -right-10 top-0 h-56 w-56 rounded-full bg-white/20 blur-2xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3 text-white">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/80">
                  Clean & colorful
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Organic picks
                </h2>
                <p className="mt-2 max-w-md text-sm font-medium text-white/85">
                  Grown with care — for mornings that taste like sunshine.
                </p>
              </div>
              <Link
                href="/shop?organic=1"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[var(--fs-ink)] shadow-sm hover:bg-[var(--fs-citrus)]"
              >
                Shop organic →
              </Link>
            </div>
            <ProductGrid products={organic.data!.items} />
          </div>
        </section>
      )}

      {/* Fresh grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-leaf)]">
              In stock now
            </p>
            <h2 className="fs-section-title mt-1 text-3xl font-extrabold sm:text-4xl">
              Fresh & ready
            </h2>
            <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
              Grab what’s ripe today.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-extrabold text-[var(--fs-leaf)] hover:underline"
          >
            Full catalog →
          </Link>
        </div>
        {fresh.isLoading && (
          <p className="text-sm font-medium text-[var(--fs-muted)]">Loading fruit…</p>
        )}
        {fresh.error && (
          <p className="rounded-[1.25rem] bg-[#fde8ef] px-4 py-3 text-sm font-semibold text-[var(--fs-berry)]">
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

      {/* Bottom CTA banner */}
      <section className="relative overflow-hidden py-16 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(115deg,#ff5a36_0%,#fb8500_40%,#e63956_100%)]"
        />
        <div
          aria-hidden
          className="fs-float absolute -left-8 bottom-0 h-48 w-48 rounded-full bg-[var(--fs-citrus)]/40 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
            Craving something ripe?
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium text-white/85 sm:text-base">
            Sign in with your phone and keep your favourites ready for the next snack attack.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-[var(--fs-leaf-deep)] shadow-lg hover:bg-[var(--fs-citrus)]"
            >
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
