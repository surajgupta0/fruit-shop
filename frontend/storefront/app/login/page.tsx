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
        <div className="grid min-h-screen place-items-center text-sm text-[var(--fs-leaf)]">
          Loading…
        </div>
      }
    >
      <CustomerAuthForm mode="login" />
    </Suspense>
  );
}
