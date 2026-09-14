import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerAuthForm } from "@/src/modules/auth/CustomerAuthForm";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Fruit Shop with your mobile number. Secure one-time password — no account password required.",
  openGraph: {
    title: "Sign in · Fruit Shop",
    description: "Access your Fruit Shop account with phone OTP.",
  },
  robots: { index: true, follow: true },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--fs-canvas)] text-sm font-semibold text-[var(--fs-muted)]">
          <span className="size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
          Loading…
        </div>
      }
    >
      <CustomerAuthForm mode="login" />
    </Suspense>
  );
}
