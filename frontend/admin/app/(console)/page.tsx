"use client";

import Link from "next/link";
import { useAuth, useQuery } from "@fruitshop/web-core";

import { visibleNav } from "@/src/console/nav";
import { P } from "@/src/console/permissions";
import { PageHeader, SectionLabel, StatusPill, Surface } from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";
import { ordersApi } from "@/src/modules/orders/api";

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fs-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--fs-ink)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--fs-muted)]">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-white p-4 shadow-[var(--fs-shadow-sm)] transition hover:border-[var(--fs-leaf)]/35"
      >
        {inner}
      </Link>
    );
  }
  return <Surface padded>{inner}</Surface>;
}

export default function ConsoleOverviewPage() {
  const { user, hasPermission } = useAuth();
  const canCatalog = hasPermission(P.CATALOG_MANAGE);
  const canOrders = hasPermission(P.ORDERS_MANAGE);
  const panels = visibleNav(hasPermission).filter((item) => item.href !== "/");

  const active = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, status: "active" }),
    [],
    { enabled: canCatalog },
  );
  const draft = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, status: "draft" }),
    [],
    { enabled: canCatalog },
  );
  const archived = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, status: "archived" }),
    [],
    { enabled: canCatalog },
  );
  const featured = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 1, featured: true }),
    [],
    { enabled: canCatalog },
  );
  const allProducts = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 40, status: "active" }),
    [],
    { enabled: canCatalog },
  );
  const categories = useQuery(() => catalogApi.listCategories(), [], { enabled: canCatalog });
  const brands = useQuery(() => catalogApi.listBrands(), [], { enabled: canCatalog });

  const openOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "confirmed" }),
    [],
    { enabled: canOrders },
  );
  const pendingOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1, status: "pending" }),
    [],
    { enabled: canOrders },
  );
  const allOrders = useQuery(
    () => ordersApi.list({ page: 1, page_size: 1 }),
    [],
    { enabled: canOrders },
  );

  const inventoryPreview = useQuery(
    async () => {
      const list = allProducts.data?.items ?? [];
      const details = await Promise.all(
        list.slice(0, 25).map((p) => catalogApi.getProduct(p.id).catch(() => null)),
      );
      const rows: Array<{
        productId: string;
        productName: string;
        sku: string;
        stock: number;
        threshold: number;
        variantId: string;
      }> = [];
      for (const d of details) {
        if (!d) continue;
        for (const v of d.variants) {
          if (v.stock_qty <= v.low_stock_threshold) {
            rows.push({
              productId: d.id,
              productName: d.name,
              sku: v.sku,
              stock: v.stock_qty,
              threshold: v.low_stock_threshold,
              variantId: v.id,
            });
          }
        }
      }
      return rows.sort((a, b) => a.stock - b.stock);
    },
    [allProducts.data],
    { enabled: canCatalog && Boolean(allProducts.data) },
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Fruit shop ops — catalog health, stock alerts, and access in one place."
      />

      {canCatalog && (
        <section>
          <SectionLabel>Catalog snapshot</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active"
              value={active.data?.total ?? "—"}
              hint="Live on storefront"
              href="/products?status=active"
            />
            <StatCard
              label="Drafts"
              value={draft.data?.total ?? "—"}
              hint="Not published yet"
              href="/products?status=draft"
            />
            <StatCard
              label="Featured"
              value={featured.data?.total ?? "—"}
              hint="Highlighted picks"
              href="/products"
            />
            <StatCard
              label="Archived"
              value={archived.data?.total ?? "—"}
              hint="Hidden from shop"
              href="/products?status=archived"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Categories"
              value={categories.data?.length ?? "—"}
              href="/categories"
            />
            <StatCard label="Brands" value={brands.data?.length ?? "—"} href="/brands" />
            <StatCard
              label="Low stock SKUs"
              value={inventoryPreview.data?.length ?? (inventoryPreview.isLoading ? "…" : "—")}
              hint="Needs restock attention"
              href="/inventory"
            />
          </div>
        </section>
      )}

      {canOrders && (
        <section>
          <SectionLabel>Orders snapshot</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="All orders"
              value={allOrders.data?.total ?? "—"}
              href="/orders"
            />
            <StatCard
              label="Pending payment"
              value={pendingOrders.data?.total ?? "—"}
              hint="Awaiting online payment"
              href="/orders?status=pending"
            />
            <StatCard
              label="To fulfil"
              value={openOrders.data?.total ?? "—"}
              hint="Confirmed — pack & ship"
              href="/orders?status=confirmed"
            />
          </div>
        </section>
      )}

      {canCatalog && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <SectionLabel>Stock alerts</SectionLabel>
            <Link href="/inventory" className="text-sm text-[var(--fs-leaf)] hover:underline">
              Open inventory →
            </Link>
          </div>
          <Surface>
            {inventoryPreview.isLoading && (
              <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">Scanning stock…</p>
            )}
            {inventoryPreview.data && inventoryPreview.data.length === 0 && (
              <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">
                No low-stock variants in the latest active products sample.
              </p>
            )}
            {inventoryPreview.data && inventoryPreview.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/50 text-[11px] uppercase tracking-wide text-[var(--fs-muted)]">
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fs-line)]">
                    {inventoryPreview.data.slice(0, 8).map((row) => (
                      <tr key={row.variantId} className="hover:bg-[var(--fs-mist)]/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/products/${row.productId}`}
                            className="font-medium hover:text-[var(--fs-leaf)]"
                          >
                            {row.productName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                        <td className="px-4 py-3">{row.stock}</td>
                        <td className="px-4 py-3">
                          <StatusPill tone={row.stock === 0 ? "danger" : "warn"}>
                            {row.stock === 0 ? "Out of stock" : "Low"}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Surface>
        </section>
      )}

      <section>
        <SectionLabel>Panels</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-[var(--fs-surface)] p-4 shadow-[var(--fs-shadow-sm)] transition hover:border-[var(--fs-leaf)]/40"
            >
              <h2 className="font-medium text-[var(--fs-ink)] group-hover:text-[var(--fs-leaf)]">
                {item.label}
              </h2>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
