"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation } from "@fruitshop/web-core";

import { AuthShell, Btn, Field, Input } from "@/src/console/ui";
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
    <AuthShell
      title="Reset your password"
      subtitle="Enter your staff email. If an account exists, we’ll send a secure reset link."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[var(--fs-line)] bg-white p-6 shadow-[var(--fs-shadow)] sm:p-7"
        noValidate
      >
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--fs-mist)] text-[var(--fs-accent)]">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--fs-ink)]">
              Check your inbox for a reset link. It expires in about an hour.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-extrabold text-[var(--fs-accent)] hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
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

            <Btn
              type="submit"
              disabled={mutation.isLoading || !email.trim()}
              className="mt-6 w-full !py-3"
            >
              {mutation.isLoading ? "Sending…" : "Send reset link"}
            </Btn>

            <p className="mt-5 text-center text-sm font-medium text-[var(--fs-muted)]">
              <Link href="/login" className="font-extrabold text-[var(--fs-accent)] hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
