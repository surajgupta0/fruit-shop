"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  ConsolePage,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  PageHeader,
  Pagination,
  Panel,
  Select,
  StatusPill,
  Surface,
  TableHead,
  TableSkeleton,
  Toolbar,
} from "@/src/console/ui";
import {
  couponsApi,
  type DiscountType,
} from "@/src/modules/coupons/api";

function CouponsPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const params = useMemo(
    () => ({ page, page_size: 20, search: search.trim() || undefined }),
    [page, search],
  );
  const list = useQuery(() => couponsApi.list(params), [params]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    discount_type: "percent" as DiscountType,
    percent_off: "10",
    amount_off: "50",
    min_subtotal: "0",
    usage_limit: "",
    per_user_limit: "1",
    first_order_only: false,
  });

  const create = useMutation(() =>
    couponsApi.create({
      code: form.code.trim(),
      name: form.name.trim(),
      discount_type: form.discount_type,
      percent_off:
        form.discount_type === "percent" ? Number(form.percent_off) || 0 : null,
      amount_off:
        form.discount_type === "fixed" ? Number(form.amount_off) || 0 : null,
      min_subtotal: Number(form.min_subtotal) || 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
      first_order_only: form.first_order_only,
      is_active: true,
    }),
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setForm((f) => ({ ...f, code: "", name: "" }));
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.page_size))
    : 1;

  return (
    <ConsolePage>
      <PageHeader
        eyebrow="Commerce"
        title="Coupons"
        description="Create percent, fixed, or free-shipping codes for checkout."
      />

      <Panel
        title="New coupon"
        description="Codes are case-insensitive at checkout; we store them uppercase."
      >
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="FRESH10"
                required
              />
            </Field>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="10% off fresh fruit"
                required
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.discount_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discount_type: e.target.value as DiscountType,
                  }))
                }
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </Select>
            </Field>
            {form.discount_type === "percent" && (
              <Field label="Percent off">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.percent_off}
                  onChange={(e) => setForm((f) => ({ ...f, percent_off: e.target.value }))}
                />
              </Field>
            )}
            {form.discount_type === "fixed" && (
              <Field label="Amount off (₹)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount_off}
                  onChange={(e) => setForm((f) => ({ ...f, amount_off: e.target.value }))}
                />
              </Field>
            )}
            <Field label="Min subtotal (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.min_subtotal}
                onChange={(e) => setForm((f) => ({ ...f, min_subtotal: e.target.value }))}
              />
            </Field>
            <Field label="Global usage limit">
              <Input
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Per-user limit">
              <Input
                type="number"
                min={1}
                value={form.per_user_limit}
                onChange={(e) => setForm((f) => ({ ...f, per_user_limit: e.target.value }))}
              />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--fs-ink)]">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--fs-line)] accent-[var(--fs-accent)]"
              checked={form.first_order_only}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_order_only: e.target.checked }))
              }
            />
            First order only
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Btn type="submit" disabled={create.isLoading || !form.code.trim() || !form.name.trim()}>
              {create.isLoading ? "Creating…" : "Create coupon"}
            </Btn>
            {create.error && <ErrorLine message={create.error.message} />}
          </div>
        </form>
      </Panel>

      <Toolbar>
        <Input
          type="search"
          placeholder="Search codes or names…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:min-w-[220px] sm:flex-1"
        />
        {search && (
          <Btn
            variant="ghost"
            className="!py-2"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
          >
            Clear
          </Btn>
        )}
      </Toolbar>

      <Surface>
        {list.isLoading && <TableSkeleton rows={6} />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState
            title="No coupons match"
            body={
              search
                ? "Try a different code or clear search."
                : "Create your first discount code above."
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <TableHead>
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Code</th>
                    <th className="px-4 py-3">Offer</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </TableHead>
                <tbody className="divide-y divide-[var(--fs-line)]">
                  {list.data.items.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[var(--fs-mist)]/50">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="font-mono text-sm font-extrabold tracking-wide">{c.code}</p>
                        <p className="text-xs font-medium text-[var(--fs-muted)]">{c.name}</p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--fs-muted)]">
                        {c.discount_type === "percent" && `${c.percent_off}% off`}
                        {c.discount_type === "fixed" && `₹${c.amount_off} off`}
                        {c.discount_type === "free_shipping" && "Free shipping"}
                        {c.first_order_only ? " · first order" : ""}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-semibold">
                        {c.usage_count}
                        {c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill tone={c.is_active ? "ok" : "neutral"}>
                          {c.is_active ? "Active" : "Off"}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="mr-3 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
                          onClick={async () => {
                            try {
                              await couponsApi.update(c.id, { is_active: !c.is_active });
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          {c.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-[var(--fs-danger)] hover:underline"
                          onClick={async () => {
                            if (!confirm(`Delete ${c.code}?`)) return;
                            try {
                              await couponsApi.delete(c.id);
                              await list.refetch();
                            } catch {
                              /* toast */
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              totalPages={totalPages}
              total={list.data.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </Surface>
    </ConsolePage>
  );
}

export default function CouponsPage() {
  return (
    <RequirePermission permission={P.COUPONS_MANAGE}>
      <CouponsPanel />
    </RequirePermission>
  );
}
