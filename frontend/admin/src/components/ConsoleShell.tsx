"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@fruitshop/web-core";
import { useEffect, useId, useState, type ReactNode } from "react";

import {
  groupedNav,
  isNavActive,
  pageDescription,
  pageTitle,
  requiredPermissionForPath,
  visibleNav,
} from "@/src/console/nav";
import { RequirePermission } from "@/src/components/RequirePermission";
import { PageLoader } from "@/src/console/ui";

function FruitMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-8" : "size-9";
  return (
    <div
      className={`fs-brand-mark grid ${dim} shrink-0 place-items-center rounded-xl`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[1.15em]" fill="currentColor">
        <path
          d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z"
          opacity=".9"
        />
        <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
      </svg>
    </div>
  );
}

function SidebarBody({
  onNavigate,
  userName,
  userMeta,
  onLogout,
  nav,
  pathname,
}: {
  onNavigate?: () => void;
  userName: string;
  userMeta: string;
  onLogout: () => void | Promise<void>;
  nav: ReturnType<typeof visibleNav>;
  pathname: string;
}) {
  const groups = groupedNav(nav);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--fs-line)] px-4 py-5">
        <FruitMark />
        <div className="min-w-0">
          <Link
            href="/"
            onClick={onNavigate}
            className="block truncate text-lg font-extrabold leading-none tracking-tight text-[var(--fs-ink)]"
          >
            Fruit Shop
          </Link>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--fs-accent)]">
            Admin console
          </p>
        </div>
      </div>

      <nav className="mt-3 flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Console">
        {groups.map((group) => (
          <div key={group.group}>
            {group.label ? (
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--fs-muted)]">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={item.description}
                      className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? "fs-nav-active"
                          : "font-semibold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]/70 hover:text-[var(--fs-ink)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--fs-line)] p-3">
        <div className="rounded-xl bg-[var(--fs-mist)]/60 px-3 py-3">
          <p className="truncate text-sm font-extrabold text-[var(--fs-ink)]">{userName}</p>
          <p className="mt-0.5 truncate text-xs font-medium capitalize text-[var(--fs-muted)]">
            {userMeta}
          </p>
          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className="mt-2.5 text-xs font-extrabold text-[var(--fs-accent-deep)] hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, bootstrapping, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const drawerTitleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("fs-drawer-open", open);
    return () => document.body.classList.remove("fs-drawer-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (bootstrapping) {
    return (
      <div className="fs-console">
        <PageLoader title="Opening console" detail="Checking your session and permissions…" />
      </div>
    );
  }

  if (!user) return null;

  const nav = visibleNav(hasPermission);
  const title = pageTitle(pathname);
  const description = pageDescription(pathname);
  const userMeta = `${user.role}${user.email ? ` · ${user.email}` : ""}`;
  const routePermission = requiredPermissionForPath(pathname);

  const sidebarProps = {
    nav,
    pathname,
    userName: user.name,
    userMeta,
    onLogout: () => {
      void logout();
    },
  };

  const content = (() => {
    if (!routePermission || hasPermission(routePermission)) return children;
    return <RequirePermission permission={routePermission}>{null}</RequirePermission>;
  })();

  return (
    <div className="fs-console md:flex">
      <aside className="fs-sidebar sticky top-0 hidden h-dvh shrink-0 md:block">
        <SidebarBody {...sidebarProps} />
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[var(--fs-ink)]/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />
        <aside
          id={drawerTitleId}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={`fs-sidebar absolute inset-y-0 left-0 flex h-dvh max-w-[85vw] flex-col shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarBody {...sidebarProps} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--fs-line)] bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-5 lg:px-8">
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fs-line)] bg-white text-[var(--fs-ink)] md:hidden"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls={drawerTitleId}
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span className="block h-0.5 w-4 rounded bg-current" />
                <span className="block h-0.5 w-4 rounded bg-current" />
                <span className="block h-0.5 w-3 rounded bg-current" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 md:hidden">
                <FruitMark size="sm" />
                <p className="truncate text-base font-extrabold text-[var(--fs-ink)]">Fruit Shop</p>
              </div>
              <div className="hidden md:block">
                <p className="truncate text-base font-extrabold text-[var(--fs-ink)] lg:text-lg">
                  {title}
                </p>
                {description ? (
                  <p className="truncate text-xs font-medium text-[var(--fs-muted)]">{description}</p>
                ) : null}
              </div>
            </div>

            <span className="hidden rounded-full bg-[var(--fs-mist)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)] sm:inline">
              {user.role}
            </span>
          </div>
        </header>

        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">{content}</main>
      </div>
    </div>
  );
}
