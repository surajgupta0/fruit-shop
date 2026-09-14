"use client";

import Link from "next/link";
import { useQuery } from "@fruitshop/web-core";

import { HeroSlider } from "@/src/components/HeroSlider";
import {
  CategoryCard,
  CategorySkeletonGrid,
  ProductGrid,
  ProductSkeletonGrid,
  SectionHeader,
} from "@/src/components/ProductCard";
import { StoreShell } from "@/src/components/StoreChrome";
import { catalogApi, flattenCategories } from "@/src/modules/catalog/api";

const FALLBACK_CATS = [
  {
    name: "Fresh Fruits",
    href: "/shop",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Seasonal",
    href: "/shop?featured=1",
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Citrus",
    href: "/shop?q=orange",
    image:
      "https://images.unsplash.com/photo-1519996529931-28324d5a39e9?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Organic",
    href: "/shop?organic=1",
    image:
      "https://images.unsplash.com/photo-1490474413989-9f9c6dd11eb9?auto=format&fit=crop&w=900&q=80",
  },
] as const;

const PROMISES = [
  {
    n: "01",
    title: "Picked for ripeness",
    body: "Fruit that is ready to enjoy — never warehouse-hard.",
  },
  {
    n: "02",
    title: "Packed after you order",
    body: "Careful packing so delicate fruit arrives intact.",
  },
  {
    n: "03",
    title: "Farm to door care",
    body: "Cold-aware handling from counter to your kitchen.",
  },
  {
    n: "04",
    title: "Easy phone checkout",
    body: "OTP login — no passwords, just fresh fruit faster.",
  },
] as const;

const COLLECTION_IMAGES = [
  "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80",
] as const;

export default function HomePage() {
  const categories = useQuery(() => catalogApi.listCategoryTree(), []);
  const featured = useQuery(() => catalogApi.listProducts({ featured: true, page_size: 8 }), []);
  const fresh = useQuery(() => catalogApi.listProducts({ page_size: 8 }), []);

  const liveCats = flattenCategories(categories.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 4);

  const catCards =
    liveCats.length > 0
      ? liveCats.map((c, i) => ({
          name: c.name,
          href: `/category/${c.slug}`,
          image: c.image_url || FALLBACK_CATS[i % FALLBACK_CATS.length]!.image,
        }))
      : FALLBACK_CATS.map((c) => ({ ...c }));

  const collectionCards =
    liveCats.length >= 2
      ? liveCats.slice(0, 4).map((c, i) => ({
          name: c.name,
          href: `/category/${c.slug}`,
          image: c.image_url || COLLECTION_IMAGES[i % COLLECTION_IMAGES.length]!,
        }))
      : FALLBACK_CATS.map((c, i) => ({
          name: c.name,
          href: c.href,
          image: COLLECTION_IMAGES[i % COLLECTION_IMAGES.length]!,
        }));

  return (
    <StoreShell>
      <HeroSlider />

      {/* Shop by category */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <SectionHeader
          eyebrow="Explore"
          title="Shop by category"
          action={
            <Link href="/shop" className="text-sm font-extrabold text-[var(--fs-accent)] hover:underline">
              View all →
            </Link>
          }
        />
        {categories.isLoading ? (
          <CategorySkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {catCards.map((c) => (
              <CategoryCard key={c.name} href={c.href} name={c.name} image={c.image} />
            ))}
          </div>
        )}
      </section>

      {/* Our fruit promise */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="fs-eyebrow">Our fruit promise</p>
            <h2 className="fs-section-title mt-2 text-3xl sm:text-4xl">How we deliver only the best</h2>
            <p className="mt-3 text-sm font-medium text-[var(--fs-muted)] sm:text-base">
              Quality checks, careful packing, and checkout built for busy fruit lovers.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p) => (
              <div
                key={p.n}
                className="rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-canvas)] p-5 shadow-[var(--fs-shadow-sm)]"
              >
                <p className="text-2xl font-extrabold text-[var(--fs-accent)]">{p.n}</p>
                <p className="mt-3 text-lg font-extrabold text-[var(--fs-ink)]">{p.title}</p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-[var(--fs-muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Taste the aisle / collections */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <SectionHeader
          eyebrow="Collections"
          title="Taste the aisle"
          subtitle="Tap a collection and fill your cart with something ripe."
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {collectionCards.map((c) => (
            <CategoryCard key={`col-${c.name}`} href={c.href} name={c.name} image={c.image} />
          ))}
        </div>
      </section>

      {/* Seasonal harvest band — soft orange, not black */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#fb923c] via-[#f97316] to-[#fdba74] py-12 text-white sm:py-14">
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/90">
              This week’s harvest
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Seasonal fruit, delivered fresh
            </h2>
            <p className="mt-2 text-sm font-medium text-white/90">
              What’s ripe changes every week — shop the current drop before it’s gone.
            </p>
          </div>
          <Link
            href="/shop?featured=1"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[var(--fs-accent-deep)] shadow-md hover:bg-[#fff7ed]"
          >
            Shop the harvest
          </Link>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow="Bestsellers"
            title="Customer favourites"
            subtitle="The fruit people reorder again and again."
            action={
              <Link
                href="/shop?featured=1"
                className="text-sm font-extrabold text-[var(--fs-accent)] hover:underline"
              >
                See featured →
              </Link>
            }
          />
          {featured.isLoading ? (
            <ProductSkeletonGrid count={4} />
          ) : (
            <ProductGrid
              products={featured.data?.items ?? []}
              empty="Featured fruit coming soon — check back shortly."
            />
          )}
        </div>
      </section>

      {/* Fresh & ready */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <SectionHeader
          eyebrow="In stock"
          title="Fresh & ready"
          subtitle="Grab what’s ripe today."
          action={
            <Link href="/shop" className="text-sm font-extrabold text-[var(--fs-accent)] hover:underline">
              Full catalog →
            </Link>
          }
        />
        {fresh.isLoading ? (
          <ProductSkeletonGrid count={8} />
        ) : fresh.error ? (
          <p className="rounded-2xl bg-[#fff1e6] px-4 py-3 text-sm font-semibold text-[var(--fs-accent-deep)]">
            {fresh.error.message}
          </p>
        ) : (
          <ProductGrid
            products={fresh.data?.items ?? []}
            empty="No fruit published yet — check back soon."
          />
        )}
      </section>

      {/* Soft CTA */}
      <section className="border-t border-[var(--fs-line)] bg-[var(--fs-mist)] py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="fs-section-title text-3xl sm:text-4xl">Ready for something ripe?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium text-[var(--fs-muted)]">
            Sign in with your phone and keep favourites ready for the next craving.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="fs-btn-primary">
              Start shopping
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[var(--fs-accent)]/30 bg-white px-6 py-3 text-sm font-extrabold text-[var(--fs-accent-deep)] hover:bg-white/80"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
