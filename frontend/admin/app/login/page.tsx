import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Secure sign-in for Fruit Shop administrators and staff.",
  robots: { index: false, follow: false },
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
      <AdminLoginForm />
    </Suspense>
  );
}
