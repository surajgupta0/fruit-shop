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
      title="Staff access by invite"
      subtitle="Accounts are created in the console with roles and permissions. Ask your admin to provision you."
    >
      <div className="rounded-2xl border border-[var(--fs-line)] bg-white p-6 shadow-[var(--fs-shadow)] sm:p-7">
        <ol className="space-y-4">
          {[
            "Ask an admin to create your staff user.",
            "They assign a role with the right permissions.",
            "Sign in here with your work email and password.",
          ].map((step, i) => (
            <li key={step} className="flex gap-3 text-sm font-medium text-[var(--fs-muted)]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--fs-mist)] text-xs font-extrabold text-[var(--fs-accent-deep)]">
                {i + 1}
              </span>
              <span className="pt-1 text-[var(--fs-ink)]">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-col gap-2">
          <Link href="/login" className="fs-btn-primary w-full !rounded-xl">
            Back to sign in
          </Link>
          <a
            href="mailto:admin@fruitshop.example?subject=Staff%20access%20request"
            className="rounded-xl px-4 py-2.5 text-center text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
          >
            Email admin
          </a>
        </div>
      </div>
    </AuthShell>
  );
}
