import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Request staff access",
  description: "Fruit Shop staff accounts are created by an administrator. Request access here.",
  robots: { index: false, follow: false },
};

export default function AdminSignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_80%_0%,#e8a31733,transparent),linear-gradient(165deg,#0f3d28,#1f6a45_55%,#143522)]"
      />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16 text-white">
        <p className="fs-rise font-[family-name:var(--font-fraunces)] text-4xl tracking-tight">
          Fruit Shop
        </p>
        <h1 className="fs-rise-delay mt-6 font-[family-name:var(--font-fraunces)] text-3xl leading-tight">
          Staff access is by invitation
        </h1>
        <p className="mt-4 text-white/75">
          Admin and staff users are provisioned from the console with role-based permissions. Ask
          your workspace admin to create your account, then sign in with email and password.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--fs-leaf-deep)]"
          >
            Back to sign in
          </Link>
          <a
            href="mailto:admin@fruitshop.example?subject=Staff%20access%20request"
            className="rounded-xl border border-white/40 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
          >
            Email admin
          </a>
        </div>
      </main>
    </div>
  );
}
