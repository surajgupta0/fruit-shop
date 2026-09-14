"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import {
  AccountCard,
  AccountLoader,
  AccountSectionTitle,
  AccountShell,
  StatusBadge,
  accountInputClass,
} from "@/src/components/AccountShell";
import { ProductGrid, ProductSkeletonGrid } from "@/src/components/ProductCard";
import { RequireAuth } from "@/src/components/RequireAuth";
import { formatPhoneDisplay } from "@/src/lib/phone";
import { customerApi } from "@/src/modules/auth/api";
import { catalogApi } from "@/src/modules/catalog/api";
import { formatMoney, ordersApi } from "@/src/modules/orders/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function AccountOverview() {
  const { user, logout, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const profile = useQuery(() => customerApi.me(), [user?.id]);
  const orders = useQuery(() => ordersApi.list({ page: 1, page_size: 5 }), []);
  const picks = useQuery(() => catalogApi.listProducts({ featured: true, page_size: 4 }), []);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setEmail(profile.data.email ?? "");
  }, [profile.data]);

  const save = useMutation(async () => {
    const updated = await customerApi.updateMe({
      name: name.trim(),
      email: email.trim() || undefined,
    });
    await refreshMe();
    return updated;
  });

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutate();
      await profile.refetch();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      /* toast */
    }
  }

  const firstName = user?.name?.split(" ")[0] || "there";
  const orderCount = orders.data?.total ?? orders.data?.items.length ?? 0;

  return (
    <AccountShell
      title={`Hi, ${firstName}`}
      subtitle="Manage your profile, orders, and delivery addresses."
      actions={
        <Link href="/shop" className="fs-btn-primary !py-2.5">
          Continue shopping
        </Link>
      }
    >
      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <AccountCard>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
            Orders
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[var(--fs-ink)]">
            {orders.isLoading ? "—" : orderCount}
          </p>
          <Link
            href="/account/orders"
            className="mt-2 inline-block text-sm font-bold text-[var(--fs-accent)] hover:underline"
          >
            View orders →
          </Link>
        </AccountCard>
        <AccountCard>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
            Sign-in
          </p>
          <p className="mt-2 text-sm font-extrabold text-[var(--fs-ink)]">
            {user?.phone
              ? formatPhoneDisplay(user.phone)
              : user?.email
                ? user.email
                : "OTP account"}
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--fs-muted)]">
            {user?.phone ? "Mobile OTP" : user?.email ? "Email OTP" : "Secure OTP login"}
          </p>
        </AccountCard>
        <AccountCard>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-muted)]">
            Shortcuts
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm font-bold">
            <Link href="/cart" className="text-[var(--fs-accent)] hover:underline">
              Open cart →
            </Link>
            <Link href="/account/addresses" className="text-[var(--fs-accent)] hover:underline">
              Addresses →
            </Link>
          </div>
        </AccountCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Recent orders */}
        <div className="lg:col-span-3">
          <AccountSectionTitle
            title="Recent orders"
            action={
              <Link
                href="/account/orders"
                className="text-sm font-bold text-[var(--fs-accent)] hover:underline"
              >
                View all
              </Link>
            }
          />
          <AccountCard padded={false}>
            {orders.isLoading && <AccountLoader label="Loading orders…" />}
            {orders.data && orders.data.items.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="font-extrabold text-[var(--fs-ink)]">No orders yet</p>
                <p className="mt-1 text-sm text-[var(--fs-muted)]">Your fruit orders will show here.</p>
                <Link href="/shop" className="fs-btn-primary mt-5 inline-flex !py-2.5">
                  Start shopping
                </Link>
              </div>
            )}
            {orders.data && orders.data.items.length > 0 && (
              <ul className="divide-y divide-[var(--fs-line)]">
                {orders.data.items.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-[var(--fs-mist)]/50"
                    >
                      <div className="min-w-0">
                        <p className="font-extrabold text-[var(--fs-ink)]">{order.order_number}</p>
                        <p className="mt-0.5 text-sm font-medium text-[var(--fs-muted)]">
                          {formatWhen(order.created_at)} · {order.items.length} item
                          {order.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="font-extrabold">{formatMoney(order.total)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AccountCard>
        </div>

        {/* Profile */}
        <div className="lg:col-span-2">
          <AccountSectionTitle title="Profile" />
          <AccountCard>
            {profile.isLoading ? (
              <AccountLoader label="Loading profile…" />
            ) : (
              <form onSubmit={onSave}>
                <label className="block text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">Name</span>
                  <input
                    className={accountInputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="mt-4 block text-sm">
                  <span className="font-bold text-[var(--fs-ink)]">Email (optional)</span>
                  <input
                    type="email"
                    className={accountInputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <p className="mt-3 text-xs font-medium text-[var(--fs-muted)]">
                  Sign-in stays on your mobile or email OTP — no password.
                </p>
                {savedFlash && (
                  <p className="mt-3 text-sm font-bold text-[var(--fs-accent-deep)]">
                    Profile saved.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={save.isLoading}
                  className="fs-btn-primary mt-5 w-full !py-3"
                >
                  {save.isLoading ? "Saving…" : "Save changes"}
                </button>
              </form>
            )}
          </AccountCard>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => void logout({ allSessions: true })}
              className="w-full rounded-xl border border-[var(--fs-line)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
            >
              Sign out everywhere
            </button>
          </div>
        </div>
      </div>

      {(picks.isLoading || (picks.data?.items.length ?? 0) > 0) && (
        <section className="mt-10">
          <AccountSectionTitle
            title="Picked for you"
            action={
              <Link href="/shop?featured=1" className="text-sm font-bold text-[var(--fs-accent)] hover:underline">
                See more →
              </Link>
            }
          />
          {picks.isLoading ? (
            <ProductSkeletonGrid count={4} />
          ) : (
            <ProductGrid products={picks.data!.items} />
          )}
        </section>
      )}
    </AccountShell>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountOverview />
    </RequireAuth>
  );
}
