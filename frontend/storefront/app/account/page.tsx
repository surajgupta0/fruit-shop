"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth, useMutation, useQuery } from "@fruitshop/web-core";

import { StoreChrome, StoreHeader } from "@/src/components/StoreChrome";
import { formatPhoneDisplay } from "@/src/lib/phone";
import { customerApi } from "@/src/modules/auth/api";

export default function AccountPage() {
  const { user, logout, bootstrapping, isAuthenticated, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const profile = useQuery(() => customerApi.me(), [user?.id], {
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

  return (
    <StoreChrome>
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#0c2e1c,#14532d_55%,#1a4d30)] pb-24 pt-4 text-white">
        <StoreHeader />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-4 pt-24 sm:px-6">
          <p className="text-sm text-white/60">Your account</p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-4xl">
            {user.name}
          </h1>
          <p className="mt-2 text-sm text-white/65">{formatPhoneDisplay(user.phone)}</p>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-12 max-w-3xl space-y-5 px-4 pb-16 sm:px-6">
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-medium text-[var(--fs-ink)]">Profile</h2>
          <p className="mt-1 text-sm text-[var(--fs-muted)]">
            Update how we greet you. Phone stays as your login.
          </p>

          <label className="mt-5 block text-sm">
            <span className="font-medium text-stone-700">Name</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-[var(--fs-line)] px-3.5 py-2.5 outline-none focus:border-[var(--fs-leaf)] focus:ring-2 focus:ring-[var(--fs-leaf)]/15"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
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

        <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-5 sm:p-6">
          <h2 className="font-medium text-[var(--fs-ink)]">Sign-in method</h2>
          <p className="mt-2 text-sm text-[var(--fs-muted)]">
            Phone OTP · {formatPhoneDisplay(user.phone)}
          </p>
          <p className="mt-1 text-xs text-[var(--fs-muted)]">
            Customers use OTP only. Staff use the admin console with email.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl border border-[var(--fs-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
          >
            Continue shopping
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </StoreChrome>
  );
}
