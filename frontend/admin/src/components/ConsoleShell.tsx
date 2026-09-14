"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@fruitshop/web-core";
import { useEffect, useId, useState, type ReactNode } from "react";

import {
  groupedNav,
  isNavActive,
  requiredPermissionForPath,
  visibleNav,
  type NavIcon,
} from "@/src/console/nav";
import { RequirePermission } from "@/src/components/RequirePermission";
import { PageLoader } from "@/src/console/ui";

function FruitMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-8" : "size-9";
  return (
    <div className={`fs-brand-mark grid ${dim} shrink-0 place-items-center rounded-xl`} aria-hidden>
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

function NavGlyph({ icon }: { icon: NavIcon }) {
  const common = "size-4 shrink-0 opacity-90";
  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" />
          <path d="M12 13v8M3 8l9 5 9-5" />
        </svg>
      );
    case "stock":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V8" strokeLinecap="round" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "brand":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      );
    case "tag":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12 12 4H5v7l8 8 7-7z" strokeLinejoin="round" />
          <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 4h11l1 4H6l1-4zM6 8v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" />
          <path d="M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
      );
    case "coupon":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9a2 2 0 0 0 2-2V5h14v2a2 2 0 1 0 0 4v2a2 2 0 1 0 0 4v2H5v-2a2 2 0 1 0 0-4V9z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5L6 16z" strokeLinejoin="round" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M12 3.5 14.6 9l5.9.9-4.3 4.2 1 5.9L12 17.3 6.8 20l1-5.9L3.5 9.9 9.4 9 12 3.5z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.5 19a4.5 4.5 0 0 1 5.5-4.3" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function SidebarBody({
  onNavigate,
  userName,
  userRole,
  userEmail,
  onLogout,
  nav,
  pathname,
}: {
  onNavigate?: () => void;
  userName: string;
  userRole: string;
  userEmail?: string;
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
            Admin
          </p>
        </div>
      </div>

      <nav className="mt-3 flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Console">
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
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                        active ? "fs-nav-active" : "fs-nav-idle font-semibold"
                      }`}
                    >
                      <NavGlyph icon={item.icon} />
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
        <div className="rounded-xl bg-[var(--fs-canvas)] px-3 py-3">
          <p className="truncate text-sm font-extrabold text-[var(--fs-ink)]">{userName}</p>
          <p className="mt-0.5 truncate text-xs font-medium capitalize text-[var(--fs-muted)]">
            {userRole}
            {userEmail ? ` · ${userEmail}` : ""}
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
  const routePermission = requiredPermissionForPath(pathname);

  const sidebarProps = {
    nav,
    pathname,
    userName: user.name,
    userRole: user.role,
    userEmail: user.email ?? undefined,
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
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
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
        <header className="sticky top-0 z-20 border-b border-[var(--fs-line)] bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-8">
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

            <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
              <FruitMark size="sm" />
              <p className="truncate text-base font-extrabold text-[var(--fs-ink)]">Fruit Shop Admin</p>
            </div>

            <div className="hidden min-w-0 flex-1 md:block">
              <p className="text-sm font-bold text-[var(--fs-muted)]">
                Overview of catalog, orders, and store operations
              </p>
            </div>

            <span className="rounded-full bg-[var(--fs-mist)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--fs-accent-deep)]">
              {user.role}
            </span>
          </div>
        </header>

        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">{content}</main>
      </div>
    </div>
  );
}
