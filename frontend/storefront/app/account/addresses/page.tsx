"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import {
  AccountCard,
  AccountLoader,
  AccountSectionTitle,
  AccountShell,
  accountInputClass,
} from "@/src/components/AccountShell";
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
        is_default: false,
      });
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  const empty = list.data && list.data.length === 0 && !showForm;

  return (
    <AccountShell
      title="Addresses"
      subtitle="Saved delivery locations for faster checkout."
      actions={
        !showForm ? (
          <button type="button" className="fs-btn-primary !py-2.5" onClick={() => setShowForm(true)}>
            Add address
          </button>
        ) : null
      }
    >
      {list.isLoading && (
        <AccountCard>
          <AccountLoader label="Loading addresses…" />
        </AccountCard>
      )}

      {empty && (
        <AccountCard className="text-center">
          <p className="text-lg font-extrabold text-[var(--fs-ink)]">No addresses yet</p>
          <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">
            Add home, work, or gift addresses so checkout is quicker next time.
          </p>
          <button
            type="button"
            className="fs-btn-primary mt-6 inline-flex"
            onClick={() => setShowForm(true)}
          >
            Add address
          </button>
        </AccountCard>
      )}

      {list.data && list.data.length > 0 && (
        <ul className="space-y-3">
          {list.data.map((a) => (
            <li key={a.id}>
              <AccountCard>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold capitalize text-[var(--fs-ink)]">{a.label}</p>
                      {a.is_default && (
                        <span className="rounded-full bg-[var(--fs-mist)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-[var(--fs-muted)]">
                      {formatAddress(a)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm font-bold">
                    {!a.is_default && (
                      <button
                        type="button"
                        className="text-[var(--fs-accent)] hover:underline"
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
                      className="text-rose-600 hover:underline"
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
              </AccountCard>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className={list.data && list.data.length > 0 ? "mt-6" : ""}>
          <AccountSectionTitle title="New address" />
          <AccountCard>
            <form onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-bold text-[var(--fs-ink)]">Label</span>
                  <select
                    className={accountInputClass}
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-bold text-[var(--fs-ink)]">Address line 1</span>
                  <input
                    className={accountInputClass}
                    value={form.line1}
                    onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-bold text-[var(--fs-ink)]">Address line 2 (optional)</span>
                  <input
                    className={accountInputClass}
                    value={form.line2}
                    onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">City</span>
                  <input
                    className={accountInputClass}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">State</span>
                  <input
                    className={accountInputClass}
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">Postal code</span>
                  <input
                    className={accountInputClass}
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                  />
                  Default address
                </label>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="submit" disabled={create.isLoading} className="fs-btn-primary !py-2.5">
                  {create.isLoading ? "Saving…" : "Save address"}
                </button>
                <button
                  type="button"
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </AccountCard>
        </div>
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
