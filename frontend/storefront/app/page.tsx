"use client";

import { useQuery } from "@fruitshop/web-core";

import { catalogApi } from "@/src/modules/catalog/api";

export default function HomePage() {
  const { data, isLoading, error } = useQuery(() => catalogApi.listProducts({ page_size: 12 }), []);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Fruit Shop</h1>
        <p className="mt-1 text-stone-500">Fresh picks — powered by shared web-core</p>
      </header>

      {isLoading && <p className="text-sm text-stone-500">Loading products…</p>}
      {error && <p className="text-sm text-rose-600">{error.message}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((p) => (
          <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="font-medium">{p.name}</h2>
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
    </main>
  );
}
