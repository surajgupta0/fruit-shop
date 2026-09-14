import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerAuthForm } from "@/src/modules/auth/CustomerAuthForm";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Join Fruit Shop in seconds. Verify your mobile number with OTP and start ordering farm-fresh fruit.",
  openGraph: {
    title: "Create account · Fruit Shop",
    description: "Sign up with your phone — farm-fresh fruit delivered.",
  },
  robots: { index: true, follow: true },
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)] px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--fs-line)] bg-white p-8 text-center shadow-[var(--fs-shadow-sm)]">
            <span className="mx-auto block size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
            <p className="mt-4 text-sm font-bold text-[var(--fs-muted)]">Preparing signup…</p>
            <div className="mt-6 space-y-2">
              <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
              <div className="fs-skeleton mx-auto h-10 w-full !rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
