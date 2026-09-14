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
        <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)] px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--fs-line)] bg-white p-8 text-center shadow-[var(--fs-shadow-sm)]">
            <span className="mx-auto block size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
            <p className="mt-4 text-sm font-bold text-[var(--fs-muted)]">Preparing sign in…</p>
            <div className="mt-6 space-y-2">
              <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
              <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <CustomerAuthForm mode="login" />
    </Suspense>
  );
}
