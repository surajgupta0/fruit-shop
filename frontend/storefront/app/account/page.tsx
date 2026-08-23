"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { ProductGrid } from "@/src/components/ProductCard";
import { SiteHeader, StoreShell } from "@/src/components/StoreChrome";
import { formatPhoneDisplay } from "@/src/lib/phone";
import { customerApi } from "@/src/modules/auth/api";
import { catalogApi } from "@/src/modules/catalog/api";

export default function AccountPage() {
  const { user, logout, bootstrapping, isAuthenticated, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const profile = useQuery(() => customerApi.me(), [user?.id], {
    enabled: Boolean(isAuthenticated && user),
  });
  const picks = useQuery(() => catalogApi.listProducts({ featured: true, page_size: 3 }), [], {
    enabled: Boolean(isAuthenticated && user),
  });

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

  if (bootstrapping) {
    return (
      <div className="fs-store-canvas grid min-h-dvh place-items-center text-sm text-[var(--fs-muted)]">
        Loading account…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutate();
      await profile.refetch();
    } catch {
      /* toast */
    }
  }

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <StoreShell header="hero">
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#0c2e1c_0%,#14532d_50%,#1f6a45_100%)] pb-28 text-white">
        <SiteHeader variant="hero" />
        <div
          aria-hidden
          className="fs-drift pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-[var(--fs-mango)]/20 blur-3xl"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-2 pt-28 sm:px-6 lg:px-8">
          <p className="text-sm text-white/55">Your Fruit Shop</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl tracking-tight sm:text-5xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/70">
            Manage your profile, jump back into the catalog, and keep ripe favourites close.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[var(--fs-mango)] px-5 py-2.5 text-sm font-semibold text-[var(--fs-orchard)] hover:bg-[var(--fs-citrus)]"
            >
              Continue shopping
            </Link>
            <Link
              href="/shop?featured=1"
              className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20"
            >
              Featured picks
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-14 max-w-5xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/shop", title: "Shop fruit", body: "Browse by category & tag" },
            { href: "/shop?organic=1", title: "Organic", body: "Clean, farm-grown picks" },
            { href: "/shop?featured=1", title: "Bestsellers", body: "What everyone reorders" },
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

        <div className="grid gap-5 lg:grid-cols-5">
          <form
            onSubmit={onSave}
            className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
          >
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--fs-ink)]">
              Profile
            </h2>
            <p className="mt-1 text-sm text-[var(--fs-muted)]">
              How we greet you. Phone stays as your OTP login.
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
              {save.isLoading ? "Saving…" : "Save changes"}
            </button>
          </form>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm">
              <h2 className="font-medium text-[var(--fs-ink)]">Sign-in</h2>
              <p className="mt-2 text-sm text-[var(--fs-muted)]">
                Phone OTP · {formatPhoneDisplay(user.phone)}
              </p>
              <p className="mt-1 text-xs text-[var(--fs-muted)]">
                No password needed on the storefront.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--fs-line)] bg-[var(--fs-mist)]/60 p-5">
              <h2 className="font-medium text-[var(--fs-ink)]">Need help?</h2>
              <p className="mt-2 text-sm text-[var(--fs-muted)]">
                Browse categories from the home page or search the full catalog anytime.
              </p>
              <Link
                href="/"
                className="mt-3 inline-block text-sm font-semibold text-[var(--fs-leaf)] hover:underline"
              >
                Back to home →
              </Link>
            </div>
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
          <section>
            <h2 className="mb-5 font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
              Picked for you
            </h2>
            <ProductGrid products={picks.data!.items} />
          </section>
        )}
      </div>
    </StoreShell>
  );
}
