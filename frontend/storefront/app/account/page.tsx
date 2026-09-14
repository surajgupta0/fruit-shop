"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { AccountShell } from "@/src/components/AccountShell";
import { ProductGrid } from "@/src/components/ProductCard";
import { RequireAuth } from "@/src/components/RequireAuth";
import { formatPhoneDisplay } from "@/src/lib/phone";
import { customerApi } from "@/src/modules/auth/api";
import { catalogApi } from "@/src/modules/catalog/api";
import { formatMoney, orderStatusLabel, ordersApi } from "@/src/modules/orders/api";

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

  const profile = useQuery(() => customerApi.me(), [user?.id]);
  const orders = useQuery(() => ordersApi.list({ page: 1, page_size: 5 }), []);
  const picks = useQuery(() => catalogApi.listProducts({ featured: true, page_size: 3 }), []);

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
    } catch {
      /* toast */
    }
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <AccountShell
      title={`Welcome, ${firstName}`}
      subtitle="Manage profile, track orders, and save delivery addresses."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/shop", title: "Shop fruit", body: "Browse the catalog" },
          { href: "/account/orders", title: "Your orders", body: "Track & reorder" },
          { href: "/cart", title: "Cart", body: "Ready to checkout?" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm transition hover:border-[var(--fs-leaf)]/35 hover:shadow-md"
          >
            <p className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--fs-ink)]">
              {card.title}
            </p>
            <p className="mt-1 text-sm text-[var(--fs-muted)]">{card.body}</p>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--fs-line)] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--fs-line)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--fs-ink)]">
            Recent orders
          </h2>
          <Link href="/account/orders" className="text-sm font-medium text-[var(--fs-leaf)] hover:underline">
            View all
          </Link>
        </div>
        {orders.isLoading && (
          <p className="px-5 py-8 text-sm text-[var(--fs-muted)]">Loading orders…</p>
        )}
        {orders.data && orders.data.items.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[var(--fs-muted)]">No orders yet.</p>
            <Link
              href="/shop"
              className="mt-3 inline-block text-sm font-semibold text-[var(--fs-leaf)] hover:underline"
            >
              Start shopping →
            </Link>
          </div>
        )}
        {orders.data && orders.data.items.length > 0 && (
          <ul className="divide-y divide-[var(--fs-line)]">
            {orders.data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-[var(--fs-mist)]/40"
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-[var(--fs-muted)]">
                      {formatWhen(order.created_at)} · {order.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(order.total)}</p>
                    <p className="text-xs capitalize text-[var(--fs-leaf)]">
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
        >
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--fs-ink)]">
            Profile
          </h2>
          <p className="mt-1 text-sm text-[var(--fs-muted)]">
            Update how we address you. Sign-in stays on your mobile or email OTP.
          </p>

          <label className="mt-5 block text-sm">
            <span className="font-medium text-stone-700">Name</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3.5 py-2.5 outline-none focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="font-medium text-stone-700">Email (optional)</span>
            <input
              type="email"
              className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3.5 py-2.5 outline-none focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={save.isLoading}
            className="mt-5 rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--fs-leaf)] disabled:opacity-60"
          >
            {save.isLoading ? "Saving…" : "Save profile"}
          </button>
        </form>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm">
            <h2 className="font-medium text-[var(--fs-ink)]">Sign-in</h2>
            <p className="mt-2 text-sm text-[var(--fs-muted)]">
              {user?.phone
                ? `Mobile OTP · ${formatPhoneDisplay(user.phone)}`
                : user?.email
                  ? `Email OTP · ${user.email}`
                  : "OTP sign-in"}
            </p>
          </div>
          <Link
            href="/account/addresses"
            className="block rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/60 p-5 transition hover:border-[var(--fs-leaf)]/30"
          >
            <p className="font-medium text-[var(--fs-ink)]">Saved addresses</p>
            <p className="mt-1 text-sm text-[var(--fs-muted)]">Manage delivery locations →</p>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      </div>

      {(picks.data?.items.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="mb-5 font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
            Picked for you
          </h2>
          <ProductGrid products={picks.data!.items} />
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
