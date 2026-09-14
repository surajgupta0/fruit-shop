"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  LoadingLine,
  PageHeader,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import {
  inventoryApi,
  type InventoryLevel,
  type InventoryMovement,
} from "@/src/modules/inventory/api";

type FilterMode = "all" | "low" | "out";
type ActionMode = "adjust" | "receive" | "set";

function statusFor(row: InventoryLevel): { label: string; tone: "ok" | "warn" | "danger" | "neutral" } {
  if (!row.track_inventory) return { label: "Not tracked", tone: "neutral" };
  if (row.is_out_of_stock) return { label: "Out", tone: "danger" };
  if (row.is_low_stock) return { label: "Low", tone: "warn" };
  return { label: "OK", tone: "ok" };
}

function movementLabel(type: string) {
  switch (type) {
    case "sale":
      return "Sale";
    case "sale_restore":
      return "Restore";
    case "adjustment":
      return "Adjust";
    case "receive":
      return "Receive";
    case "set":
      return "Set";
    default:
      return type;
  }
}

function InventoryPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selected, setSelected] = useState<InventoryLevel | null>(null);
  const [action, setAction] = useState<ActionMode>("adjust");
  const [delta, setDelta] = useState("-1");
  const [quantity, setQuantity] = useState("10");
  const [stockQty, setStockQty] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [movementsPage, setMovementsPage] = useState(1);

  const levelParams = useMemo(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      low_stock_only: filter === "low",
      out_of_stock_only: filter === "out",
      active_only: true,
    }),
    [page, search, filter],
  );

  const levels = useQuery(() => inventoryApi.listLevels(levelParams), [levelParams]);
  const lowStock = useQuery(
    () => inventoryApi.listLowStock({ page: 1, page_size: 100 }),
    [],
  );

  const movementParams = useMemo(
    () => ({
      page: movementsPage,
      page_size: 15,
      variant_id: selected?.variant_id,
    }),
    [movementsPage, selected?.variant_id],
  );
  const movements = useQuery(
    () => inventoryApi.listMovements(movementParams),
    [movementParams],
  );

  const adjust = useMutation(() =>
    inventoryApi.adjust({
      variant_id: selected!.variant_id,
      delta: Number(delta),
      reason: reason.trim(),
      note: note.trim() || undefined,
    }),
  );
  const receive = useMutation(() =>
    inventoryApi.receive({
      variant_id: selected!.variant_id,
      quantity: Number(quantity),
      reason: reason.trim() || "Stock received",
      note: note.trim() || undefined,
    }),
  );
  const setStock = useMutation(() =>
    inventoryApi.set({
      variant_id: selected!.variant_id,
      stock_qty: Number(stockQty),
      reason: reason.trim(),
      note: note.trim() || undefined,
    }),
  );

  const stats = useMemo(() => {
    const rows = lowStock.data?.items ?? [];
    const out = rows.filter((r) => r.is_out_of_stock).length;
    const low = rows.filter((r) => r.is_low_stock && !r.is_out_of_stock).length;
    return {
      tracked: levels.data?.total ?? 0,
      low: lowStock.data?.total ?? low,
      out,
    };
  }, [levels.data, lowStock.data]);

  function openAction(row: InventoryLevel, mode: ActionMode) {
    setSelected(row);
    setAction(mode);
    setDelta(mode === "adjust" ? "-1" : "1");
    setQuantity("10");
    setStockQty(String(row.stock_qty));
    setReason(
      mode === "receive"
        ? "Supplier delivery"
        : mode === "set"
          ? "Manual stock count"
          : "Stock adjustment",
    );
    setNote("");
    setMovementsPage(1);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      if (action === "adjust") await adjust.mutate();
      else if (action === "receive") await receive.mutate();
      else await setStock.mutate();
      await levels.refetch();
      await lowStock.refetch();
      await movements.refetch();
      const refreshed = await inventoryApi.getLevel(selected.variant_id);
      setSelected(refreshed);
      setStockQty(String(refreshed.stock_qty));
    } catch {
      /* toast */
    }
  }

  const busy = adjust.isLoading || receive.isLoading || setStock.isLoading;
  const totalPages = levels.data
    ? Math.max(1, Math.ceil(levels.data.total / levels.data.page_size))
    : 1;
  const movementPages = movements.data
    ? Math.max(1, Math.ceil(movements.data.total / movements.data.page_size))
    : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Inventory"
        description="On-hand, reserved, and available stock with an audited movement ledger."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Tracked SKUs", value: stats.tracked },
          { label: "Low stock", value: stats.low },
          { label: "Out of stock", value: stats.out },
        ].map((s) => (
          <Surface key={s.label} padded>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fs-muted)]">
              {s.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl">
              {levels.isLoading || lowStock.isLoading ? "…" : s.value}
            </p>
          </Surface>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search SKU, variant, or product…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["low", "Low stock"],
              ["out", "Out of stock"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                filter === value
                  ? "bg-[var(--fs-leaf-deep)] text-white ring-[var(--fs-leaf-deep)]"
                  : "bg-white text-[var(--fs-muted)] ring-[var(--fs-line)] hover:text-[var(--fs-ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Surface>
          {levels.isLoading && <LoadingLine label="Loading stock levels…" />}
          {levels.error && <ErrorLine message={levels.error.message} />}
          {levels.data && levels.data.items.length === 0 && (
            <EmptyState
              title="No stock rows"
              body="Enable track inventory on products, or clear filters."
            />
          )}
          {levels.data && levels.data.items.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--fs-line)] bg-[var(--fs-mist)]/60 text-[11px] uppercase tracking-wide text-[var(--fs-muted)]">
                      <th className="px-4 py-3 font-semibold">Product / SKU</th>
                      <th className="px-3 py-3 font-semibold">On hand</th>
                      <th className="px-3 py-3 font-semibold">Reserved</th>
                      <th className="px-3 py-3 font-semibold">Available</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fs-line)]">
                    {levels.data.items.map((row) => {
                      const st = statusFor(row);
                      const active = selected?.variant_id === row.variant_id;
                      return (
                        <tr
                          key={row.variant_id}
                          className={active ? "bg-[var(--fs-mist)]/50" : "hover:bg-[var(--fs-mist)]/30"}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/products/${row.product_id}`}
                              className="font-medium hover:text-[var(--fs-leaf)]"
                            >
                              {row.product_name}
                            </Link>
                            <p className="text-xs text-[var(--fs-muted)]">
                              {row.variant_name} · <span className="font-mono">{row.sku}</span>
                            </p>
                          </td>
                          <td className="px-3 py-3 tabular-nums">{row.stock_qty}</td>
                          <td className="px-3 py-3 tabular-nums text-[var(--fs-muted)]">
                            {row.reserved_qty}
                          </td>
                          <td className="px-3 py-3 tabular-nums font-medium">{row.available_qty}</td>
                          <td className="px-3 py-3">
                            <StatusPill tone={st.tone}>{st.label}</StatusPill>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--fs-leaf-deep)] hover:bg-[var(--fs-mist)]"
                                onClick={() => openAction(row, "receive")}
                              >
                                Receive
                              </button>
                              <button
                                type="button"
                                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                                onClick={() => openAction(row, "adjust")}
                              >
                                Adjust
                              </button>
                              <button
                                type="button"
                                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                                onClick={() => openAction(row, "set")}
                              >
                                Set
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--fs-line)] px-4 py-3 text-sm">
                  <span className="text-[var(--fs-muted)]">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Btn
                      type="button"
                      variant="ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Btn>
                    <Btn
                      type="button"
                      variant="ghost"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Btn>
                  </div>
                </div>
              )}
            </>
          )}
        </Surface>

        <div className="space-y-4">
          <Surface padded>
            <h2 className="font-[family-name:var(--font-fraunces)] text-lg">Stock action</h2>
            {!selected ? (
              <p className="mt-2 text-sm text-[var(--fs-muted)]">
                Select Receive, Adjust, or Set on a SKU to update stock with a reason.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mt-4 space-y-3">
                <div>
                  <p className="font-medium">{selected.product_name}</p>
                  <p className="text-xs text-[var(--fs-muted)]">
                    {selected.variant_name} · {selected.sku}
                  </p>
                  <p className="mt-1 text-xs text-[var(--fs-muted)]">
                    On hand {selected.stock_qty} · Reserved {selected.reserved_qty} · Available{" "}
                    {selected.available_qty}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["receive", "adjust", "set"] as ActionMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAction(mode)}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                        action === mode
                          ? "bg-[var(--fs-leaf-deep)] text-white ring-[var(--fs-leaf-deep)]"
                          : "bg-white text-[var(--fs-muted)] ring-[var(--fs-line)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {action === "adjust" && (
                  <Field label="Delta (use negative to remove)">
                    <Input
                      type="number"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      required
                    />
                  </Field>
                )}
                {action === "receive" && (
                  <Field label="Quantity received">
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Field>
                )}
                {action === "set" && (
                  <Field label="Set on-hand qty">
                    <Input
                      type="number"
                      min={0}
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      required
                    />
                  </Field>
                )}
                <Field label="Reason">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is stock changing?"
                    required
                  />
                </Field>
                <Field label="Note (optional)">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <Btn type="submit" disabled={busy || !reason.trim()}>
                  {busy ? "Saving…" : "Apply change"}
                </Btn>
              </form>
            )}
          </Surface>

          <Surface>
            <div className="border-b border-[var(--fs-line)] px-4 py-3">
              <h2 className="font-[family-name:var(--font-fraunces)] text-lg">
                {selected ? "SKU movements" : "Recent movements"}
              </h2>
            </div>
            {movements.isLoading && <LoadingLine label="Loading ledger…" />}
            {movements.error && <ErrorLine message={movements.error.message} />}
            {movements.data && movements.data.items.length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--fs-muted)]">No movements yet.</p>
            )}
            {movements.data && movements.data.items.length > 0 && (
              <ul className="divide-y divide-[var(--fs-line)]">
                {movements.data.items.map((m: InventoryMovement) => (
                  <li key={m.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {movementLabel(m.movement_type)}{" "}
                          <span
                            className={
                              m.quantity_delta < 0 ? "text-rose-600" : "text-[var(--fs-leaf-deep)]"
                            }
                          >
                            {m.quantity_delta > 0 ? "+" : ""}
                            {m.quantity_delta}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--fs-muted)]">
                          {m.product_name || selected?.product_name} · {m.sku || selected?.sku}
                        </p>
                        {m.reason && (
                          <p className="mt-0.5 text-xs text-[var(--fs-muted)]">{m.reason}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-xs tabular-nums text-[var(--fs-muted)]">
                        {m.quantity_before} → {m.quantity_after}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {movementPages > 1 && (
              <div className="flex justify-end gap-2 border-t border-[var(--fs-line)] px-3 py-2">
                <Btn
                  type="button"
                  variant="ghost"
                  disabled={movementsPage <= 1}
                  onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Btn>
                <Btn
                  type="button"
                  variant="ghost"
                  disabled={movementsPage >= movementPages}
                  onClick={() => setMovementsPage((p) => p + 1)}
                >
                  Next
                </Btn>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequirePermission permission={P.INVENTORY_MANAGE}>
      <InventoryPanel />
    </RequirePermission>
  );
}
