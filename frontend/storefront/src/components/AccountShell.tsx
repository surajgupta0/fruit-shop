"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteHeader, StoreShell } from "@/src/components/StoreChrome";

const NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders", exact: false },
  { href: "/account/addresses", label: "Addresses", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <StoreShell header="hero">
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#0c2e1c_0%,#14532d_50%,#1f6a45_100%)] pb-16 text-white">
        <SiteHeader variant="hero" />
        <div
          aria-hidden
          className="fs-drift pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-[var(--fs-mango)]/20 blur-3xl"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-2 pt-28 sm:px-6 lg:px-8">
          <p className="text-sm text-white/55">Your account</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl tracking-tight sm:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-3 max-w-lg text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[var(--fs-line)] bg-white p-1 shadow-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive(pathname, item.href, item.exact)
                  ? "bg-[var(--fs-mist)] text-[var(--fs-leaf-deep)]"
                  : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </StoreShell>
  );
}
