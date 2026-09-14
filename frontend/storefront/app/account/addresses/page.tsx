"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { AccountShell } from "@/src/components/AccountShell";
import { RequireAuth } from "@/src/components/RequireAuth";
import { addressApi, formatAddress } from "@/src/modules/orders/api";

function AddressesPanel() {
  const list = useQuery(() => addressApi.list(), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "home",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    is_default: true,
  });

  const create = useMutation(() =>
    addressApi.create({
      label: form.label,
      line1: form.line1.trim(),
      line2: form.line2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postal_code.trim(),
      country: "IN",
      is_default: form.is_default,
    }),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setShowForm(false);
      setForm({
        label: "home",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        is_default: (list.data?.length ?? 0) === 0,
      });
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <AccountShell
      title="Saved addresses"
      subtitle="Delivery locations for checkout — add home, work, or gift addresses."
    >
      {list.isLoading && (
        <p className="text-sm text-[var(--fs-muted)]">Loading addresses…</p>
      )}

      {list.data && list.data.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-[var(--fs-line)] bg-white px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-fraunces)] text-xl">No addresses yet</p>
          <p className="mt-2 text-sm text-[var(--fs-muted)]">
            Add one now so checkout is faster next time.
          </p>
          <button
            type="button"
            className="mt-6 rounded-full bg-[var(--fs-leaf-deep)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)]"
            onClick={() => setShowForm(true)}
          >
            Add address
          </button>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <ul className="space-y-3">
          {list.data.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize text-[var(--fs-ink)]">
                    {a.label}
                    {a.is_default && (
                      <span className="ml-2 rounded-full bg-[var(--fs-mist)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--fs-leaf)]">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-[var(--fs-muted)]">
                    {formatAddress(a)}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {!a.is_default && (
                    <button
                      type="button"
                      className="font-medium text-[var(--fs-leaf)] hover:underline"
                      onClick={async () => {
                        try {
                          await addressApi.update(a.id, { is_default: true });
                          await list.refetch();
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    className="font-medium text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm("Remove this address?")) return;
                      try {
                        await addressApi.delete(a.id);
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(list.data?.length ?? 0) > 0 && !showForm && (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-[var(--fs-leaf)] hover:underline"
          onClick={() => setShowForm(true)}
        >
          + Add another address
        </button>
      )}

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl">New address</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Label</span>
              <select
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Address line 1</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.line1}
                onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Address line 2 (optional)</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.line2}
                onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">City</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">State</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Postal code</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3 py-2.5 text-sm"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                required
              />
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
              />
              Default address
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={create.isLoading}
              className="rounded-full bg-[var(--fs-leaf-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)] disabled:opacity-60"
            >
              {create.isLoading ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              className="rounded-full px-5 py-2.5 text-sm text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </AccountShell>
  );
}

export default function AddressesPage() {
  return (
    <RequireAuth>
      <AddressesPanel />
    </RequireAuth>
  );
}
