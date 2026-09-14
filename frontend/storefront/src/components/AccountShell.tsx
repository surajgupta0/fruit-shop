"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { StoreShell } from "@/src/components/StoreChrome";
import { orderStatusLabel, type OrderStatus } from "@/src/modules/orders/api";

const NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders", exact: false },
  { href: "/account/reviews", label: "Reviews", exact: false },
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
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <StoreShell>
      <div className="border-b border-[var(--fs-line)] bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--fs-accent)]">
                My account
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--fs-ink)] sm:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 max-w-lg text-sm font-medium text-[var(--fs-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {actions}
          </div>

          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Account">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "border-[var(--fs-accent)] text-[var(--fs-accent-deep)]"
                      : "border-transparent text-[var(--fs-muted)] hover:text-[var(--fs-ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </StoreShell>
  );
}

export function AccountCard({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--fs-line)] bg-white shadow-[var(--fs-shadow-sm)] ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AccountSectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold text-[var(--fs-ink)]">{title}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const s = status as OrderStatus;
  const tone =
    s === "delivered"
      ? "bg-[var(--fs-mist)] text-[var(--fs-accent-deep)]"
      : s === "cancelled"
        ? "bg-rose-50 text-rose-700"
        : s === "shipped" || s === "processing"
          ? "bg-amber-50 text-amber-800"
          : "bg-stone-100 text-stone-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${tone}`}>
      {orderStatusLabel(s as OrderStatus) || status}
    </span>
  );
}

export function AccountLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
      <span className="text-sm font-semibold text-[var(--fs-muted)]">{label}</span>
    </div>
  );
}

export function AccountEmpty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <AccountCard className="text-center">
      <p className="text-lg font-extrabold text-[var(--fs-ink)]">{title}</p>
      <p className="mt-2 text-sm font-medium text-[var(--fs-muted)]">{body}</p>
      <Link href={href} className="fs-btn-primary mt-6 inline-flex">
        {cta}
      </Link>
    </AccountCard>
  );
}

export const accountInputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--fs-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--fs-accent)] focus:ring-2 focus:ring-[var(--fs-accent)]/15";
