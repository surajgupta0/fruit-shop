"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useMutation } from "@fruitshop/web-core";

import { AuthShell, Btn, Field, Input, Spinner } from "@/src/console/ui";

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

  if (bootstrapping) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--fs-line)] bg-white p-8 text-center shadow-[var(--fs-shadow-sm)]">
          <Spinner className="mx-auto size-5" />
          <p className="mt-4 text-sm font-bold text-[var(--fs-muted)]">Checking session…</p>
          <div className="mt-6 space-y-2">
            <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
            <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Sign in to continue"
      subtitle="Use the staff email and password issued by your admin. Customers sign in on the storefront with OTP."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[var(--fs-line)] bg-white p-6 shadow-[var(--fs-shadow)] sm:p-7"
        noValidate
      >
        <Field label="Work email">
          <Input
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@fruitshop.example"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--fs-ink)]">Password</span>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-[var(--fs-accent)] hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pr-16"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[var(--fs-accent)]"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <Btn type="submit" disabled={mutation.isLoading} className="mt-6 w-full !py-3">
          {mutation.isLoading ? "Signing in…" : "Sign in"}
        </Btn>

        <p className="mt-5 text-center text-sm font-medium text-[var(--fs-muted)]">
          Need access?{" "}
          <Link href="/signup" className="font-extrabold text-[var(--fs-accent)] hover:underline">
            Request staff invite
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
