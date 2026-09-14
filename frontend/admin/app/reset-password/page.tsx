import type { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@/src/console/ui";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new Fruit Shop staff password.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
