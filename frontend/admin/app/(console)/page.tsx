"use client";

import Link from "next/link";
import { useAuth } from "@fruitshop/web-core";

const PANELS = [
  {
    href: "/users",
    title: "Users",
    description: "List staff and customers, create accounts, change roles and status.",
    permission: "users:list",
  },
  {
    href: "/roles",
    title: "Roles & access",
    description: "See which permissions each role grants across the system.",
    permission: "roles:list",
  },
] as const;

export default function ConsoleOverviewPage() {
  const { user, hasPermission } = useAuth();

  const panels = PANELS.filter((p) => hasPermission(p.permission));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="fs-rise">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--fs-ink)]">
          Overview
        </h1>
        <p className="mt-2 text-stone-600">
          Welcome back, {user?.name}. Use the console to manage accounts and access.
        </p>
      </div>

      <div className="fs-rise-delay grid gap-4 sm:grid-cols-2">
        {panels.map((panel) => (
          <Link
            key={panel.href}
            href={panel.href}
            className="group block rounded-2xl border border-stone-200/80 bg-white p-5 transition hover:border-[var(--fs-leaf)]/40 hover:shadow-sm"
          >
            <h2 className="font-medium text-[var(--fs-ink)] group-hover:text-[var(--fs-leaf)]">
              {panel.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{panel.description}</p>
          </Link>
        ))}
        {panels.length === 0 && (
          <p className="text-sm text-stone-500 sm:col-span-2">
            Your role doesn’t include user or roles management yet.
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-stone-200/80 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">Your access</h2>
        <p className="mt-1 text-sm text-stone-700">
          {user?.role} · {(user?.permissions ?? []).length} permissions
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          {(user?.permissions ?? []).join(" · ") || "No permissions listed"}
        </p>
      </section>
    </div>
  );
}
