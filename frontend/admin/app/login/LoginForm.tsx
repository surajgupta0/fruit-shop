"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useMutation } from "@fruitshop/web-core";

export function AdminLoginForm() {
  const { login, isAuthenticated, bootstrapping } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation(async (e: string, p: string) => login(e, p));

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) router.replace(next);
  }, [bootstrapping, isAuthenticated, next, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await mutation.mutate(email.trim(), password);
      router.replace(next);
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
      <div
        aria-hidden
        className="fs-drift absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-[#e8a31722] blur-2xl"
      />
      <div
        aria-hidden
        className="fs-drift absolute -right-10 top-24 h-72 w-72 rounded-full bg-[#ffffff18] blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />

      <main className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <section className="fs-rise text-white">
          <p className="font-[family-name:var(--font-fraunces)] text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
            Fruit Shop
          </p>
          <h1 className="mt-5 max-w-md text-lg text-white/85 sm:text-xl">
            Staff console for catalog, inventory, and orders.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/65">
            Use the email and password issued by your administrator. Customer accounts sign in on
            the storefront with phone OTP.
          </p>
        </section>

        <section className="fs-rise-delay mx-auto w-full max-w-md">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl bg-white/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.25)] backdrop-blur"
            noValidate
          >
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--fs-ink)]">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-stone-500">Admin &amp; staff access</p>

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

            <label className="mt-4 block space-y-1.5 text-sm">
              <span className="flex items-center justify-between font-medium text-stone-700">
                <span>Password</span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[var(--fs-leaf)] hover:underline"
                >
                  Forgot password?
                </Link>
              </span>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 pr-16 outline-none transition focus:border-[var(--fs-leaf)] focus:bg-white focus:ring-2 focus:ring-[var(--fs-leaf)]/20"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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

            <button
              type="submit"
              disabled={mutation.isLoading}
              className="mt-6 w-full rounded-xl bg-[var(--fs-leaf-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--fs-leaf)] disabled:opacity-60"
            >
              {mutation.isLoading ? "Signing in…" : "Continue"}
            </button>

            <p className="mt-5 text-center text-sm text-stone-500">
              Need an account?{" "}
              <Link href="/signup" className="font-medium text-[var(--fs-leaf)] hover:underline">
                Request staff access
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
