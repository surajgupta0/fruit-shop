"use client";

import { useAuth, useQuery } from "@fruitshop/web-core";

import { catalogApi } from "@/src/modules/catalog/api";

export default function AdminHomePage() {
  const { user, logout, bootstrapping, hasPermission } = useAuth();

  const products = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 5 }),
    [user?.id],
    { enabled: Boolean(user) && hasPermission("catalog:manage") },
  );

  if (bootstrapping) {
    return <div className="p-8 text-sm text-stone-500">Loading session…</div>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-stone-500">
            Signed in as {user?.name} ({user?.role})
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">Permissions</h2>
        <p className="mt-2 text-sm text-stone-700">
          {(user?.permissions ?? []).slice(0, 8).join(" · ")}
          {(user?.permissions?.length ?? 0) > 8 ? " …" : ""}
        </p>
      </section>

      {hasPermission("catalog:manage") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Recent products</h2>
            <button
              type="button"
              className="text-sm text-stone-500 hover:text-stone-800"
              onClick={() => void products.refetch()}
            >
              Refresh
            </button>
          </div>
          {products.isLoading && <p className="text-sm text-stone-500">Loading products…</p>}
          {products.error && (
            <p className="text-sm text-rose-600">{products.error.message}</p>
          )}
          {products.data && (
            <ul className="divide-y divide-stone-100">
              {products.data.items.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="text-stone-500">{p.status}</span>
                </li>
              ))}
              {products.data.items.length === 0 && (
                <li className="py-2 text-sm text-stone-500">No products yet</li>
              )}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
