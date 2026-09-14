"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@fruitshop/web-core";

import { authApi } from "@/src/modules/auth/api";

export function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = useMemo(() => search.get("token")?.trim() ?? "", [search]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const mutation = useMutation((nextPassword: string) =>
    authApi.resetPassword(token, nextPassword),
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      await mutation.mutate(password);
      router.replace("/login");
    } catch {
      /* toast from api */
    }
  }

  if (!token) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(160deg,#0f3d28_0%,#1f6a45_45%,#143522_100%)]"
        />
        <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-white">
          <p className="font-[family-name:var(--font-fraunces)] text-4xl tracking-tight">
            Fruit Shop
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-3xl">
            Reset link incomplete
          </h1>
          <p className="mt-3 text-white/75">
            Open the link from your email, or request a new password reset.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/forgot-password"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--fs-leaf-deep)]"
            >
              Request reset
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,#2f8f5b55,transparent),linear-gradient(160deg,#0f3d28_0%,#1f6a45_45%,#143522_100%)]"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <p className="fs-rise font-[family-name:var(--font-fraunces)] text-4xl text-white tracking-tight">
          Fruit Shop
        </p>
        <form
          onSubmit={onSubmit}
          className="fs-rise-delay mt-8 rounded-3xl bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
          noValidate
        >
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Use at least 8 characters. You&apos;ll sign in again afterward.
          </p>

          <label className="mt-6 block space-y-1.5 text-sm">
            <span className="font-medium text-stone-700">New password</span>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 pr-16 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--fs-leaf)]"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-stone-700">Confirm password</span>
            <input
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
              type={showPassword ? "text" : "password"}
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </label>

          {mismatch && (
            <p className="mt-2 text-sm text-rose-600">Passwords do not match.</p>
          )}

          <button
            type="submit"
            disabled={mutation.isLoading || password.length < 8}
            className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
          >
            {mutation.isLoading ? "Updating…" : "Update password"}
          </button>

          <p className="mt-5 text-center text-sm text-stone-500">
            <Link href="/login" className="font-medium text-[var(--fs-leaf)] hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
