"use client";

import Link from "next/link";
import { useAuth } from "@fruitshop/web-core";

function FruitMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`fs-brand-mark inline-grid size-9 place-items-center rounded-xl text-white ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path
          d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z"
          opacity=".9"
        />
        <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
      </svg>
    </span>
  );
}

export function StoreHeader() {
  const { user, logout, bootstrapping, isAuthenticated } = useAuth();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <FruitMark />
          <span className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight sm:text-2xl">
            Fruit Shop
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {bootstrapping ? (
            <span className="text-white/50">…</span>
          ) : isAuthenticated && user ? (
            <>
              <Link
                href="/account"
                className="hidden truncate max-w-[10rem] text-white/85 hover:text-white sm:inline"
              >
                {user.name}
              </Link>
              <Link
                href="/account"
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Account
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3.5 py-2 text-white/90 transition hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--fs-mango)] px-4 py-2 font-semibold text-[var(--fs-orchard)] shadow-sm transition hover:bg-[var(--fs-citrus)]"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function StoreChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="fs-store-canvas flex min-h-dvh flex-col">
      {children}
      <footer className="mt-auto border-t border-[var(--fs-line)] bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--fs-ink)]">
            Fruit Shop
          </p>
          <p className="text-sm text-[var(--fs-muted)]">
            Fresh fruit · Phone OTP login · Doorstep delivery
          </p>
        </div>
      </footer>
    </div>
  );
}
