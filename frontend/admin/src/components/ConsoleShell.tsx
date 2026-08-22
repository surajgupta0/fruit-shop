"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@fruitshop/web-core";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Overview", permission: null },
  { href: "/users", label: "Users", permission: "users:list" },
  { href: "/roles", label: "Roles & access", permission: "roles:list" },
] as const;

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, bootstrapping, hasPermission } = useAuth();

  if (bootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-stone-500">
        Loading console…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const links = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-[var(--fs-mist)] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b border-stone-200 bg-[var(--fs-leaf-deep)] text-white lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="px-5 py-5">
          <Link href="/" className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight">
            Fruit Shop
          </Link>
          <p className="mt-1 text-xs text-white/60">Admin console</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:pb-6">
          {links.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-white/55">
            {user.role} · {user.email || user.phone}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:px-8">
          <div className="min-w-0 lg:hidden">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 lg:hidden"
          >
            Sign out
          </button>
          <p className="hidden text-sm text-stone-500 lg:block">
            Manage accounts, roles, and access
          </p>
        </header>
        <div className="px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
