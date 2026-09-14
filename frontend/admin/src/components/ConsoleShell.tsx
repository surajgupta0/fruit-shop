"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@fruitshop/web-core";
import { useEffect, useId, useState, type ReactNode } from "react";

import { isNavActive, pageTitle, requiredPermissionForPath, visibleNav } from "@/src/console/nav";
import { RequirePermission } from "@/src/components/RequirePermission";

function FruitMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-8 text-sm" : "size-9 text-base";
  return (
    <div
      className={`fs-brand-mark grid ${dim} shrink-0 place-items-center rounded-xl font-[family-name:var(--font-display)] font-semibold`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[1.15em]" fill="currentColor">
        <path d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z" opacity=".9" />
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <FruitMark />
        <div className="min-w-0">
          <Link
            href="/"
            onClick={onNavigate}
            className="block truncate font-[family-name:var(--font-display)] text-lg leading-none tracking-tight text-white"
          >
            Fruit Shop
          </Link>
          <p className="mt-1 text-[11px] text-white/45">Admin</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Console">
        {nav.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "fs-nav-active font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <div className="rounded-xl bg-black/20 px-3 py-3">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-white/45">{userMeta}</p>
          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className="mt-2.5 text-xs font-medium text-[var(--fs-mango)] hover:underline"
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
      <div className="fs-console grid min-h-dvh place-items-center">
        <div className="text-center">
          <FruitMark />
          <p className="mt-3 text-sm text-[var(--fs-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const nav = visibleNav(hasPermission);
  const title = pageTitle(pathname);
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
      {/* Desktop / tablet left sidebar */}
      <aside className="fs-sidebar sticky top-0 hidden h-dvh shrink-0 text-white md:block">
        <SidebarBody {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[var(--fs-orchard)]/50 transition-opacity ${
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
          className={`fs-sidebar absolute inset-y-0 left-0 flex h-dvh max-w-[85vw] flex-col text-white shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarBody {...sidebarProps} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--fs-line)]/90 bg-[var(--fs-surface)]/90 backdrop-blur-md">
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
                <p className="truncate font-[family-name:var(--font-fraunces)] text-base text-[var(--fs-ink)]">
                  Fruit Shop
                </p>
              </div>
              <p className="hidden truncate text-sm font-medium text-[var(--fs-ink)] md:block lg:text-base">
                {title}
              </p>
            </div>

            <span className="hidden rounded-full bg-[var(--fs-mist)] px-2.5 py-1 text-[11px] font-medium capitalize text-[var(--fs-leaf-deep)] sm:inline">
              {user.role}
            </span>
          </div>
        </header>

        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">{content}</main>
      </div>
    </div>
  );
}
