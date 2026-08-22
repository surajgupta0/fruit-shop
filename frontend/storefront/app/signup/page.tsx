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
        <div className="grid min-h-screen place-items-center text-sm text-[var(--fs-leaf)]">
          Loading…
        </div>
      }
    >
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
