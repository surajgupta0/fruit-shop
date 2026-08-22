"use client";

import Link from "next/link";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { StoreChrome, StoreHeader } from "@/src/components/StoreChrome";
import { catalogApi } from "@/src/modules/catalog/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=2400&q=80";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error } = useQuery(
    () => catalogApi.listProducts({ page_size: 12 }),
    [],
  );

  return (
    <StoreChrome>
      {/* Full-bleed fruit hero — brand first */}
      <section className="relative min-h-[88dvh] overflow-hidden text-white">
        <img
          src={HERO_IMAGE}
          alt=""
          className="fs-fade-in absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(105deg,rgba(15,61,36,0.92)_0%,rgba(20,83,45,0.72)_42%,rgba(15,61,36,0.35)_100%)]"
        />
        <div
          aria-hidden
          className="fs-drift pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-[var(--fs-mango)]/25 blur-3xl"
        />

        <StoreHeader />

        <div className="relative z-10 mx-auto flex min-h-[88dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8">
          <p className="fs-rise font-[family-name:var(--font-fraunces)] text-5xl leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Fruit Shop
          </p>
          <h1 className="fs-rise-delay mt-5 max-w-lg text-xl font-medium text-white/90 sm:text-2xl">
            Farm-fresh fruit, delivered to your door
          </h1>
          <p className="fs-rise-delay mt-3 max-w-md text-sm text-white/70 sm:text-base">
            Seasonal picks and exotic finds — sign in with your phone in seconds.
          </p>
          <div className="fs-rise-late mt-8 flex flex-wrap gap-3">
            <a
              href="#fresh"
              className="rounded-full bg-[var(--fs-mango)] px-6 py-3 text-sm font-semibold text-[var(--fs-orchard)] shadow-lg transition hover:bg-[var(--fs-citrus)]"
            >
              Shop fresh fruit
            </a>
            {!isAuthenticated && (
              <Link
                href="/signup"
                className="rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Get started
              </Link>
            )}
          </div>
        </div>
      </section>

      <section id="fresh" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--fs-ink)]">
              Fresh this week
            </h2>
            <p className="mt-1 text-sm text-[var(--fs-muted)]">
              Picked for ripeness — order when you’re ready.
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-[var(--fs-muted)]">Loading fruit…</p>}
        {error && <p className="text-sm text-rose-600">{error.message}</p>}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((p) => (
            <li
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[0_1px_2px_rgba(15,61,36,0.04),0_8px_24px_rgba(15,61,36,0.05)] transition hover:border-[var(--fs-leaf)]/30 hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[var(--fs-mist)]">
                {p.primary_image_url ? (
                  <img
                    src={p.primary_image_url}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[linear-gradient(145deg,#e8f5ec,#fff4e6)]">
                    <span className="font-[family-name:var(--font-fraunces)] text-4xl text-[var(--fs-leaf)]/40">
                      F
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[var(--fs-ink)]">{p.name}</h3>
                <p className="mt-1 text-sm text-[var(--fs-muted)]">
                  {p.min_price ? `₹${p.min_price}` : "See options"}
                  {p.max_price && p.max_price !== p.min_price ? ` – ₹${p.max_price}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {data && data.items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--fs-line)] bg-white/80 px-6 py-12 text-center text-sm text-[var(--fs-muted)]">
            No fruit listed yet — check back soon.
          </p>
        )}
      </section>
    </StoreChrome>
  );
}
