"use client";

import Link from "next/link";
import { useAuth } from "@fruitshop/web-core";

import { visibleNav } from "@/src/console/nav";
import { PageHeader, SectionLabel, Surface } from "@/src/console/ui";

export default function ConsoleOverviewPage() {
  const { user, hasPermission } = useAuth();
  const panels = visibleNav(hasPermission).filter((item) => item.href !== "/");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Fresh fruit shop console — manage people and access from the sidebar."
      />

      <Surface padded className="border-[var(--fs-leaf)]/15 bg-gradient-to-br from-white to-[var(--fs-mist)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fs-leaf)]">
          Fruit Shop
        </p>
        <p className="mt-2 font-[family-name:var(--font-fraunces)] text-xl text-[var(--fs-ink)]">
          Signed in as {user?.role}
        </p>
        <p className="mt-1 truncate text-sm text-[var(--fs-muted)]">
          {user?.email || user?.phone}
        </p>
      </Surface>

      <section>
        <SectionLabel>Panels</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {panels.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[var(--fs-radius)] border border-[var(--fs-line)] bg-[var(--fs-surface)] p-4 shadow-[var(--fs-shadow-sm)] transition hover:border-[var(--fs-leaf)]/40 hover:shadow-md"
            >
              <h2 className="font-medium text-[var(--fs-ink)] group-hover:text-[var(--fs-leaf)]">
                {item.label}
              </h2>
              <p className="mt-1 text-sm text-[var(--fs-muted)]">{item.description}</p>
            </Link>
          ))}
          {panels.length === 0 && (
            <Surface padded className="sm:col-span-2">
              <p className="text-sm text-[var(--fs-muted)]">
                No panels available for your role yet.
              </p>
            </Surface>
          )}
        </div>
      </section>

      <Surface padded>
        <SectionLabel>Your permissions</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {(user?.permissions ?? []).map((code) => (
            <code
              key={code}
              className="rounded-md bg-[var(--fs-mist)] px-2 py-1 font-mono text-[11px] text-[var(--fs-leaf-deep)]"
            >
              {code}
            </code>
          ))}
          {!user?.permissions?.length && (
            <p className="text-sm text-[var(--fs-muted)]">None listed.</p>
          )}
        </div>
      </Surface>
    </div>
  );
}
