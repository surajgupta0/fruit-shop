"use client";

import Link from "next/link";
import { useQuery } from "@fruitshop/web-core";

import { catalogApi } from "@/src/modules/catalog/api";

export default function HomePage() {
  const { data, isLoading, error } = useQuery(() => catalogApi.listProducts({ page_size: 12 }), []);

  return (
    <main>
      <header className="relative overflow-hidden bg-[linear-gradient(145deg,#0f3d28,#1f6a45_55%,#143522)] px-6 pb-16 pt-8 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
            Fruit Shop
          </p>
          <nav className="flex gap-3 text-sm">
            <Link href="/login" className="rounded-full px-4 py-2 hover:bg-white/10">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 font-semibold text-[var(--fs-leaf-deep)]"
            >
              Sign up
            </Link>
          </nav>
        </div>
        <div className="mx-auto mt-14 max-w-5xl">
          <h1 className="max-w-xl font-[family-name:var(--font-fraunces)] text-4xl leading-tight sm:text-5xl">
            Farm-fresh fruit, delivered
          </h1>
          <p className="mt-4 max-w-lg text-white/75">
            Seasonal picks and organic options — order in minutes with phone OTP.
          </p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">Fresh this week</h2>
        {isLoading && <p className="text-sm text-stone-500">Loading products…</p>}
        {error && <p className="text-sm text-rose-600">{error.message}</p>}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((p) => (
            <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="font-medium">{p.name}</h3>
              <p className="mt-1 text-sm text-stone-500">
                {p.min_price ? `₹${p.min_price}` : "See options"}
                {p.max_price && p.max_price !== p.min_price ? ` – ₹${p.max_price}` : ""}
              </p>
            </li>
          ))}
        </ul>

        {data && data.items.length === 0 && (
          <p className="text-sm text-stone-500">No products published yet.</p>
        )}
      </section>
    </main>
  );
}
