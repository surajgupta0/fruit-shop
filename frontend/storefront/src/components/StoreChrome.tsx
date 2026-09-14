"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useQuery } from "@fruitshop/web-core";
import { useEffect, useState, type ReactNode } from "react";

import { cartApi } from "@/src/modules/orders/api";

function FruitMark({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`fs-brand-mark inline-grid size-9 place-items-center rounded-xl ${
        light ? "text-white" : "text-white"
      }`}
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

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?featured=1", label: "Featured" },
  { href: "/shop?organic=1", label: "Organic" },
] as const;

type HeaderProps = {
  /** Transparent over hero imagery */
  variant?: "hero" | "solid";
};

function CartLink({ hero }: { hero: boolean }) {
  const { isAuthenticated } = useAuth();
  const cart = useQuery(() => cartApi.get(), [], {
    enabled: isAuthenticated,
  });
  const count = cart.data?.item_count ?? 0;

  return (
    <Link
      href={isAuthenticated ? "/cart" : "/login?next=/cart"}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition ${
        hero
          ? "text-white/85 hover:bg-white/10 hover:text-white"
          : "text-[var(--fs-muted)] hover:bg-[var(--fs-mist)] hover:text-[var(--fs-ink)]"
      }`}
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M6 6h15l-1.5 9h-12L6 6z" strokeLinejoin="round" />
        <path d="M6 6 5 3H2" strokeLinecap="round" />
        <circle cx="9" cy="20" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.25" fill="currentColor" stroke="none" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-[var(--fs-mango)] px-1 text-[10px] font-bold text-[var(--fs-orchard)]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ variant = "solid" }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout, bootstrapping, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const hero = variant === "hero";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkBase = hero
    ? "text-white/85 hover:text-white hover:bg-white/10"
    : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]";

  return (
    <header
      className={
        hero
          ? "absolute inset-x-0 top-0 z-50"
          : "sticky top-0 z-40 border-b border-[var(--fs-line)]/80 bg-white/90 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={`flex items-center gap-2.5 ${hero ? "text-white" : "text-[var(--fs-ink)]"}`}
        >
          <FruitMark />
          <span className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight sm:text-2xl">
            Fruit Shop
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm transition ${linkBase}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <CartLink hero={hero} />
          {bootstrapping ? (
            <span className={hero ? "text-white/50" : "text-[var(--fs-muted)]"}>…</span>
          ) : isAuthenticated && user ? (
            <>
              <Link
                href="/account"
                className={`hidden truncate max-w-[9rem] sm:inline ${
                  hero ? "text-white/85" : "text-[var(--fs-muted)]"
                }`}
              >
                {user.name}
              </Link>
              <Link
                href="/account"
                className={
                  hero
                    ? "rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-white backdrop-blur-sm hover:bg-white/20"
                    : "rounded-full border border-[var(--fs-line)] bg-white px-3.5 py-2 text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                }
              >
                Account
              </Link>
              <button
                type="button"
                onClick={logout}
                className={
                  hero
                    ? "rounded-full px-3 py-2 text-white/80 hover:bg-white/10"
                    : "rounded-full px-3 py-2 text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-full px-3.5 py-2 ${linkBase}`}
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

          <button
            type="button"
            className={`inline-flex size-10 items-center justify-center rounded-xl md:hidden ${
              hero
                ? "border border-white/25 text-white"
                : "border border-[var(--fs-line)] text-[var(--fs-ink)]"
            }`}
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex flex-col gap-1.5" aria-hidden>
              <span className="block h-0.5 w-4 rounded bg-current" />
              <span className="block h-0.5 w-4 rounded bg-current" />
              <span className="block h-0.5 w-3 rounded bg-current" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div
          className={`border-t md:hidden ${
            hero
              ? "border-white/15 bg-[var(--fs-orchard)]/95 text-white"
              : "border-[var(--fs-line)] bg-white"
          }`}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={isAuthenticated ? "/cart" : "/login?next=/cart"}
              className="rounded-lg px-3 py-2.5 text-sm"
              onClick={() => setOpen(false)}
            >
              Cart
            </Link>
            {!bootstrapping && !isAuthenticated && (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link href="/signup" className="rounded-lg px-3 py-2.5 text-sm font-semibold" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm" onClick={() => setOpen(false)}>
                Account
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--fs-line)] bg-[var(--fs-orchard)] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <FruitMark />
            <p className="font-[family-name:var(--font-fraunces)] text-xl">Fruit Shop</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Farm-fresh and exotic fruit, packed with care and delivered to your door.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Shop
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              <Link href="/shop" className="hover:text-white">
                All fruit
              </Link>
            </li>
            <li>
              <Link href="/shop?featured=1" className="hover:text-white">
                Featured
              </Link>
            </li>
            <li>
              <Link href="/shop?organic=1" className="hover:text-white">
                Organic
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Account
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-white">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-white">
                Order history
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-white">
                My account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Delivery
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>Same-day in select cities</li>
            <li>Phone OTP login — no password</li>
            <li>Packed for freshness</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} Fruit Shop. All rights reserved.</p>
          <p>Fresh · Seasonal · Delivered</p>
        </div>
      </div>
    </footer>
  );
}

export function StoreShell({
  children,
  header = "solid",
}: {
  children: ReactNode;
  header?: "hero" | "solid";
}) {
  return (
    <div className="fs-store-canvas flex min-h-dvh flex-col">
      {header === "solid" ? <SiteHeader variant="solid" /> : null}
      {children}
      <StoreFooter />
    </div>
  );
}

/** @deprecated use SiteHeader */
export const StoreHeader = () => <SiteHeader variant="hero" />;
/** @deprecated use StoreShell */
export function StoreChrome({ children }: { children: ReactNode }) {
  return <StoreShell header="hero">{children}</StoreShell>;
}
