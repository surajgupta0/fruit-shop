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
      subtitle="Enter your staff email. If an account exists, we’ll send reset instructions."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-[var(--fs-line)] bg-white p-7 shadow-[var(--fs-shadow)]"
        noValidate
      >
        <h2 className="text-2xl font-extrabold text-[var(--fs-ink)]">Forgot password</h2>
        <p className="mt-1 text-sm font-medium text-[var(--fs-muted)]">
          We’ll email a secure reset link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-[var(--fs-mist)] px-4 py-3 text-sm font-semibold text-[var(--fs-accent-deep)]">
              Check your inbox for a reset link. It expires in about an hour.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-bold text-[var(--fs-accent)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
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

            <Btn
              type="submit"
              disabled={mutation.isLoading || !email.trim()}
              className="mt-6 w-full !py-3"
            >
              {mutation.isLoading ? "Sending…" : "Send reset link"}
            </Btn>

            <p className="mt-5 text-center text-sm font-medium text-[var(--fs-muted)]">
              <Link href="/login" className="font-extrabold text-[var(--fs-accent)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
