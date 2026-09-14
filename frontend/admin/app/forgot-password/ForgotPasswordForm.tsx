"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation } from "@fruitshop/web-core";

import { authApi } from "@/src/modules/auth/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const mutation = useMutation((value: string) => authApi.forgotPassword(value));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await mutation.mutate(email.trim());
      setSent(true);
    } catch {
      /* toast from api */
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,#2f8f5b55,transparent),radial-gradient(900px_500px_at_90%_10%,#e8a31733,transparent),linear-gradient(160deg,#0f3d28_0%,#1f6a45_45%,#143522_100%)]"
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
            Reset password
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Enter your staff email. If an account exists, we&apos;ll send reset instructions.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-xl bg-[var(--fs-mist)] px-4 py-3 text-sm text-[var(--fs-leaf-deep)]">
                Check your inbox for a reset link. It expires in about an hour.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-[var(--fs-leaf)] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <label className="mt-6 block space-y-1.5 text-sm">
                <span className="font-medium text-stone-700">Work email</span>
                <input
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="you@fruitshop.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={mutation.isLoading || !email.trim()}
                className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
              >
                {mutation.isLoading ? "Sending…" : "Send reset link"}
              </button>

              <p className="mt-5 text-center text-sm text-stone-500">
                <Link href="/login" className="font-medium text-[var(--fs-leaf)] hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
