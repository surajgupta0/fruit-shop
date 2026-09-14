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
        <div className="flex min-h-screen items-center justify-center gap-3 text-sm font-semibold text-[var(--fs-muted)]">
          <span className="size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
          Loading…
        </div>
      }
    >
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
