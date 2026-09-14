import type { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@/src/console/ui";
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
        <div className="grid min-h-dvh place-items-center bg-[var(--fs-canvas)]">
          <div className="flex items-center gap-3 text-sm font-semibold text-[var(--fs-muted)]">
            <Spinner />
            Loading…
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
