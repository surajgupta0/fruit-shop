"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useQuery } from "@fruitshop/web-core";
import { useEffect, useState, type ReactNode } from "react";

import { cartApi } from "@/src/modules/orders/api";

function FruitMark() {
  return (
    <span className="fs-brand-mark inline-grid size-9 place-items-center rounded-2xl text-white" aria-hidden>
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
  { href: "/shop", label: "Shop all" },
  { href: "/shop?featured=1", label: "Bestsellers" },
  { href: "/shop?organic=1", label: "Organic" },
] as const;

const PROMO_ITEMS = [
  "Free delivery on orders over ₹499",
  "Fresh picks packed after you order",
  "Exotic & seasonal fruit every week",
  "Easy phone OTP checkout",
];

type HeaderProps = {
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
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
        hero
          ? "text-white/90 hover:bg-white/15 hover:text-white"
          : "text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
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
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-[var(--fs-berry)] px-1 text-[10px] font-bold text-white shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function PromoBar() {
  const doubled = [...PROMO_ITEMS, ...PROMO_ITEMS];
  return (
    <div className="fs-promo-bar relative z-50 overflow-hidden text-white">
      <div className="fs-marquee-track gap-10 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] sm:text-[13px]">
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex shrink-0 items-center gap-10 px-2">
            <span>{item}</span>
            <span aria-hidden className="size-1.5 rounded-full bg-white/70" />
          </span>
        ))}
      </div>
    </div>
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
    ? "text-white/90 hover:text-white hover:bg-white/15"
    : "text-[var(--fs-muted)] hover:text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]";

  return (
    <header
      className={
        hero
          ? "relative z-40"
          : "sticky top-0 z-40 border-b border-[var(--fs-line)]/90 bg-white/92 backdrop-blur-md"
      }
    >
      {!hero ? <PromoBar /> : null}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={`flex items-center gap-2.5 ${hero ? "text-white" : "text-[var(--fs-ink)]"}`}
        >
          <FruitMark />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[1.65rem]">
            Fruit Shop
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${linkBase}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          <CartLink hero={hero} />
          {bootstrapping ? (
            <span className={hero ? "text-white/50" : "text-[var(--fs-muted)]"}>…</span>
          ) : isAuthenticated && user ? (
            <>
              <Link
                href="/account"
                className={`hidden truncate max-w-[9rem] font-semibold sm:inline ${
                  hero ? "text-white/90" : "text-[var(--fs-muted)]"
                }`}
              >
                {user.name}
              </Link>
              <Link
                href="/account"
                className={
                  hero
                    ? "rounded-full border border-white/30 bg-white/15 px-3.5 py-2 font-semibold text-white backdrop-blur-sm hover:bg-white/25"
                    : "rounded-full border border-[var(--fs-line)] bg-white px-3.5 py-2 font-semibold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
                }
              >
                Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className={
                  hero
                    ? "rounded-full px-3 py-2 font-medium text-white/85 hover:bg-white/10"
                    : "rounded-full px-3 py-2 font-medium text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`rounded-full px-3.5 py-2 font-semibold ${linkBase}`}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={
                  hero
                    ? "rounded-full bg-white px-4 py-2 font-bold text-[var(--fs-leaf-deep)] shadow-sm transition hover:bg-[var(--fs-citrus)]"
                    : "rounded-full bg-[var(--fs-leaf)] px-4 py-2 font-bold text-white shadow-sm transition hover:bg-[var(--fs-leaf-deep)]"
                }
              >
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            className={`inline-flex size-10 items-center justify-center rounded-2xl md:hidden ${
              hero
                ? "border border-white/30 text-white"
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
              ? "border-white/20 bg-[#2a2420]/95 text-white"
              : "border-[var(--fs-line)] bg-white"
          }`}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={isAuthenticated ? "/cart" : "/login?next=/cart"}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold"
              onClick={() => setOpen(false)}
            >
              Cart
            </Link>
            {!bootstrapping && !isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--fs-leaf)]"
                  onClick={() => setOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link
                href="/account"
                className="rounded-xl px-3 py-2.5 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
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
    <footer className="mt-auto overflow-hidden bg-[var(--fs-orchard)] text-white">
      <div className="h-1.5 bg-[linear-gradient(90deg,#ff5a36,#ffb703,#e63956,#4cc9f0,#7b5cff)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <FruitMark />
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold">Fruit Shop</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Bright, juicy fruit for everyday snacking — packed with care and delivered with a smile.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-mango)]">
            Shop
          </p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-white/80">
            <li>
              <Link href="/shop" className="hover:text-white">
                All fruit
              </Link>
            </li>
            <li>
              <Link href="/shop?featured=1" className="hover:text-white">
                Bestsellers
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-mango)]">
            Account
          </p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-white/80">
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
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--fs-mango)]">
            Why us
          </p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-white/80">
            <li>Hand-picked for ripeness</li>
            <li>Phone OTP — no passwords</li>
            <li>Careful packing, happy unboxing</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} Fruit Shop. Made for fruit lovers.</p>
          <p>Juicy · Colorful · Delivered</p>
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
