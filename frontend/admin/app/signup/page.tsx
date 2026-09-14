import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/src/console/ui";

export const metadata: Metadata = {
  title: "Request staff access",
  description: "Fruit Shop staff accounts are created by an administrator. Request access here.",
  robots: { index: false, follow: false },
};

export default function AdminSignupPage() {
  return (
    <AuthShell
      title="Staff access is by invitation"
      subtitle="Admin and staff users are provisioned from the console with role-based permissions. Ask your workspace admin to create your account."
    >
      <div className="rounded-3xl border border-[var(--fs-line)] bg-white p-7 shadow-[var(--fs-shadow)]">
        <h2 className="text-xl font-extrabold text-[var(--fs-ink)]">How to get access</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm font-medium text-[var(--fs-muted)]">
          <li>Ask an admin to create your staff user.</li>
          <li>They assign a role with the right permissions.</li>
          <li>Sign in here with your work email and password.</li>
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="fs-btn-primary">
            Back to sign in
          </Link>
          <a
            href="mailto:admin@fruitshop.example?subject=Staff%20access%20request"
            className="rounded-xl border border-[var(--fs-line)] px-5 py-2.5 text-sm font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
          >
            Email admin
          </a>
        </div>
      </div>
    </AuthShell>
  );
}
