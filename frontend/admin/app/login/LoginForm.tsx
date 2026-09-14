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
      <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)]">
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--fs-muted)]">
          <Spinner />
          Checking session…
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Staff console"
      subtitle="Sign in with the email and password issued by your administrator. Customers use phone OTP on the storefront."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-[var(--fs-line)] bg-white p-7 shadow-[var(--fs-shadow)]"
        noValidate
      >
        <h2 className="text-2xl font-extrabold text-[var(--fs-ink)]">Sign in</h2>
        <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">Admin &amp; staff access</p>

        <div className="mt-6">
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
        </div>

        <div className="mt-4">
          <Field label="Password">
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
          </Field>
          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-[var(--fs-accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Btn type="submit" disabled={mutation.isLoading} className="mt-6 w-full !py-3">
          {mutation.isLoading ? "Signing in…" : "Continue"}
        </Btn>

        <p className="mt-5 text-center text-sm font-medium text-[var(--fs-muted)]">
          Need an account?{" "}
          <Link href="/signup" className="font-extrabold text-[var(--fs-accent)] hover:underline">
            Request staff access
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
