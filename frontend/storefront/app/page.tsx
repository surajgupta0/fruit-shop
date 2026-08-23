"use client";

import Link from "next/link";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { CategoryTile, ProductGrid } from "@/src/components/ProductCard";
import { SiteHeader, StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=2400&q=80";

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
      {/* Hero — brand first, one composition */}
      <section className="relative min-h-[92dvh] overflow-hidden text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          className="fs-fade-in absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(115deg,rgba(12,46,28,0.94)_0%,rgba(20,83,45,0.55)_48%,rgba(12,46,28,0.25)_100%)]"
        />
        <div
          aria-hidden
          className="fs-drift pointer-events-none absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-[var(--fs-mango)]/20 blur-3xl"
        />

        <SiteHeader variant="hero" />

        <div className="relative z-10 mx-auto flex min-h-[92dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24 lg:px-8">
          <p className="fs-rise font-[family-name:var(--font-fraunces)] text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
            Fruit Shop
          </p>
          <h1 className="fs-rise-delay mt-5 max-w-md text-xl font-medium text-white/90 sm:text-2xl">
            Ripe, fragrant fruit — delivered while it still tastes like orchard morning.
          </h1>
          <p className="fs-rise-delay mt-3 max-w-sm text-sm text-white/65 sm:text-base">
            Alphonso to exotic cherries. Pick a category and taste the difference.
          </p>
          <div className="fs-rise-late mt-9 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[var(--fs-mango)] px-7 py-3.5 text-sm font-semibold text-[var(--fs-orchard)] shadow-lg transition hover:bg-[var(--fs-citrus)]"
            >
              Taste the catalog
            </Link>
            {!isAuthenticated ? (
              <Link
                href="/signup"
                className="rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Create account
              </Link>
            ) : (
              <Link
                href="/account"
                className="rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Your account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Soft promise strip — below first viewport */}
      <section className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { title: "Picked for ripeness", body: "We ship fruit that’s ready to enjoy — not warehouse-hard." },
            { title: "Cold-chain care", body: "Delicate imports stay chilled from farm gate to your door." },
            { title: "Phone OTP checkout", body: "No passwords. Sign in with your mobile in seconds." },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--fs-ink)]">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories with images */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
              Shop by craving
            </h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              Tap a category — mangoes, berries, exotic finds, and gift hampers.
            </p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-[var(--fs-leaf)] hover:underline">
            All fruit →
          </Link>
        </div>
        {categories.isLoading && (
          <p className="text-sm text-[var(--fs-muted)]">Loading categories…</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {flatCats.map((c) => (
            <CategoryTile
              key={c.id}
              href={`/category/${c.slug}`}
              name={c.name}
              imageUrl={c.image_url}
              description={c.description}
            />
          ))}
        </div>
        {!categories.isLoading && flatCats.length === 0 && (
          <p className="text-sm text-[var(--fs-muted)]">
            Categories appear here once published in admin.
          </p>
        )}
      </section>

      {/* Tags */}
      {(tags.data?.length ?? 0) > 0 && (
        <section className="bg-[var(--fs-orchard)] py-10 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
              Browse by mood
            </h2>
            <p className="mt-1 text-sm text-white/60">Organic, imported, gift-ready, bestsellers…</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.data!.map((t) => (
                <Link
                  key={t.id}
                  href={`/tag/${t.slug}`}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-[var(--fs-mango)] hover:text-[var(--fs-orchard)] hover:border-transparent"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
              Chef’s picks
            </h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              Featured fruit our customers reorder again and again.
            </p>
          </div>
          <Link
            href="/shop?featured=1"
            className="text-sm font-semibold text-[var(--fs-leaf)] hover:underline"
          >
            See featured →
          </Link>
        </div>
        {featured.isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading…</p>}
        {featured.data && <ProductGrid products={featured.data.items} empty="Featured fruit coming soon." />}
      </section>

      {/* Organic band */}
      {(organic.data?.items.length ?? 0) > 0 && (
        <section className="border-y border-[var(--fs-line)] bg-[linear-gradient(180deg,#f7fbf8_0%,#eef6f0_100%)] py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight">
                  Organic & clean
                </h2>
                <p className="mt-2 text-sm text-[var(--fs-muted)]">
                  Grown with care — for mornings that taste like sunshine.
                </p>
              </div>
              <Link
                href="/shop?organic=1"
                className="text-sm font-semibold text-[var(--fs-leaf)] hover:underline"
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
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
              Fresh in stock
            </h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">Ready when you are.</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-[var(--fs-leaf)] hover:underline">
            Full catalog →
          </Link>
        </div>
        {fresh.isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading fruit…</p>}
        {fresh.error && <p className="text-sm text-rose-600">{fresh.error.message}</p>}
        {fresh.data && (
          <ProductGrid products={fresh.data.items} empty="No fruit published yet — check back soon." />
        )}
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[var(--fs-leaf-deep)] py-16 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-[var(--fs-mango)]/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
            Hungry for something ripe?
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Sign in with your phone and keep your favourites ready for the next craving.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[var(--fs-mango)] px-7 py-3 text-sm font-semibold text-[var(--fs-orchard)] hover:bg-[var(--fs-citrus)]"
            >
              Start shopping
            </Link>
            {!isAuthenticated && (
              <Link
                href="/login"
                className="rounded-full border border-white/30 px-7 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
