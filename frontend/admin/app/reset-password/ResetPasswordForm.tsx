"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@fruitshop/web-core";

import { AuthShell, Btn, Field, Input } from "@/src/console/ui";
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
      <AuthShell
        title="Reset link incomplete"
        subtitle="Open the link from your email, or request a new password reset."
      >
        <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-6 text-center shadow-[var(--fs-shadow)] sm:p-7">
          <p className="text-sm font-medium text-[var(--fs-muted)]">
            The reset token is missing from this URL.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/forgot-password" className="fs-btn-primary w-full !rounded-xl">
              Request reset
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters. You’ll sign in again afterward."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[var(--fs-line)] bg-white p-6 shadow-[var(--fs-shadow)] sm:p-7"
        noValidate
      >
        <Field label="New password">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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

        <div className="mt-4">
          <Field label="Confirm password">
            <Input
              type={showPassword ? "text" : "password"}
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </Field>
        </div>

        {mismatch && (
          <p className="mt-2 text-sm font-semibold text-rose-600">Passwords do not match.</p>
        )}

        <Btn
          type="submit"
          disabled={mutation.isLoading || password.length < 8}
          className="mt-6 w-full !py-3"
        >
          {mutation.isLoading ? "Updating…" : "Update password"}
        </Btn>

        <p className="mt-5 text-center text-sm font-medium text-[var(--fs-muted)]">
          <Link href="/login" className="font-extrabold text-[var(--fs-accent)] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
