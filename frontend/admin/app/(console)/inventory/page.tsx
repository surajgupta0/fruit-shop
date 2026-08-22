"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  EmptyState,
  ErrorLine,
  LoadingLine,
  PageHeader,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";

type StockRow = {
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  variantName: string;
  stock: number;
  threshold: number;
};

function InventoryPanel() {
  const list = useQuery(
    () => catalogApi.listProducts({ page: 1, page_size: 50 }),
    [],
  );

  const stock = useQuery(
    async () => {
      const items = list.data?.items ?? [];
      const details = await Promise.all(
        items.map((p) => catalogApi.getProduct(p.id).catch(() => null)),
      );
      const rows: StockRow[] = [];
      for (const d of details) {
        if (!d || !d.track_inventory) continue;
        for (const v of d.variants) {
          rows.push({
            productId: d.id,
            productName: d.name,
            variantId: v.id,
            sku: v.sku,
            variantName: v.name,
            stock: v.stock_qty,
            threshold: v.low_stock_threshold,
          });
        }
      }
      return rows.sort((a, b) => a.stock - b.stock);
    },
    [list.data],
    { enabled: Boolean(list.data) },
  );

  const stats = useMemo(() => {
    const rows = stock.data ?? [];
    return {
      skus: rows.length,
      out: rows.filter((r) => r.stock <= 0).length,
      low: rows.filter((r) => r.stock > 0 && r.stock <= r.threshold).length,
      ok: rows.filter((r) => r.stock > r.threshold).length,
    };
  }, [stock.data]);

  const saveStock = useMutation(
    async (args: { productId: string; variantId: string; stock_qty: number }) =>
      catalogApi.updateVariant(args.productId, args.variantId, {
        stock_qty: args.stock_qty,
      }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock by SKU — edit quantities inline. Low and out-of-stock float to the top."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "SKUs tracked", value: stats.skus },
          { label: "In stock", value: stats.ok },
          { label: "Low stock", value: stats.low },
          { label: "Out of stock", value: stats.out },
        ].map((s) => (
          <Surface key={s.label} padded>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fs-muted)]">
              {s.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl">
              {stock.isLoading ? "…" : s.value}
            </p>
          </Surface>
        ))}
      </div>

      <Surface>
        {(list.isLoading || stock.isLoading) && <LoadingLine label="Loading inventory…" />}
        {(list.error || stock.error) && (
          <ErrorLine message={(list.error || stock.error)!.message} />
        )}
        {stock.data && stock.data.length === 0 && (
          <EmptyState
            title="No tracked stock yet"
            body="Create products with variants, or enable track inventory on listings."
          />
        )}
        {stock.data && stock.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-wide text-[var(--fs-muted)]">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fs-line)]">
                {stock.data.map((row) => (
                  <tr key={row.variantId} className="hover:bg-[var(--fs-mist)]/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${row.productId}`}
                        className="font-medium hover:text-[var(--fs-leaf)]"
                      >
                        {row.productName}
                      </Link>
                      <p className="text-xs text-[var(--fs-muted)]">{row.variantName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className="w-24 rounded-lg border border-[var(--fs-line)] px-2 py-1.5"
                        defaultValue={row.stock}
                        key={`${row.variantId}-${row.stock}`}
                        onBlur={async (e) => {
                          const next = Number(e.target.value);
                          if (Number.isNaN(next) || next === row.stock) return;
                          try {
                            await saveStock.mutate({
                              productId: row.productId,
                              variantId: row.variantId,
                              stock_qty: next,
                            });
                            await stock.refetch();
                          } catch {
                            /* toast */
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={
                          row.stock <= 0 ? "danger" : row.stock <= row.threshold ? "warn" : "ok"
                        }
                      >
                        {row.stock <= 0
                          ? "Out"
                          : row.stock <= row.threshold
                            ? `Low (≤${row.threshold})`
                            : "OK"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <InventoryPanel />
    </RequirePermission>
  );
}
