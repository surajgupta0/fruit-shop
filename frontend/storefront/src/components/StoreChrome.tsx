"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useQuery } from "@fruitshop/web-core";
import { FormEvent, useEffect, useState, type ReactNode } from "react";

import { cartApi } from "@/src/modules/orders/api";
import { cmsApi } from "@/src/modules/cms/api";

function FruitMark() {
  return (
    <span className="fs-brand-mark inline-grid size-9 place-items-center rounded-2xl text-white" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
        <path d="M12 3c.4 1.6 1.4 2.6 3 3-1.2.2-2.2.8-2.8 1.8C11.4 6.8 10.2 5.6 8.5 5c1.5-.2 2.8-1 3.5-2z" opacity=".9" />
        <ellipse cx="12" cy="14.5" rx="6.5" ry="7" />
      </svg>
    </span>
  );
}

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?featured=1", label: "Featured" },
  { href: "/shop?organic=1", label: "Organic" },
] as const;

export function PromoBar() {
  const snippet = useQuery(() => cmsApi.getSnippet("announcement_bar"), []);
  const text =
    snippet.data?.body ||
    snippet.data?.title ||
    "Fresh fruit packed after you order · Phone OTP checkout · Delivery across select cities";
  const href = snippet.data?.href;
  const label = snippet.data?.href_label;

  return (
    <div className="fs-promo-bar text-center text-[12px] font-semibold sm:text-[13px]">
      <p className="px-4 py-2.5">
        {text}
        {href && label ? (
          <>
            {" · "}
            <Link href={href} className="underline underline-offset-2 hover:opacity-90">
              {label}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function CartLink() {
  const { isAuthenticated } = useAuth();
  const cart = useQuery(() => cartApi.get(), [], { enabled: isAuthenticated });
  const count = cart.data?.item_count ?? 0;

  return (
    <Link
      href={isAuthenticated ? "/cart" : "/login?next=/cart"}
      className="relative rounded-full px-3 py-2 text-sm font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
    >
      Cart
      {count > 0 && (
        <span className="ml-1.5 inline-flex min-w-[1.15rem] justify-center rounded-full bg-[var(--fs-accent)] px-1 text-[10px] font-extrabold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, bootstrapping, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--fs-line)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <FruitMark />
          <span className="text-xl font-extrabold tracking-tight">Fruit Shop</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)] hover:text-[var(--fs-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <form onSubmit={onSearch} className="hidden lg:block">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fruit…"
              className="w-44 rounded-full border border-[var(--fs-line)] bg-[var(--fs-canvas)] px-3.5 py-2 text-sm outline-none focus:border-[var(--fs-accent)]"
            />
          </form>
          <CartLink />
          {bootstrapping ? (
            <span
              className="mx-2 inline-block size-4 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]"
              aria-label="Loading"
            />
          ) : isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="rounded-full px-3 py-2 text-sm font-bold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)]"
              >
                Account
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[var(--fs-muted)] hover:bg-[var(--fs-mist)] sm:inline"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="fs-btn-primary !px-4 !py-2">
              Sign in
            </Link>
          )}
          <button
            type="button"
            className="ml-1 inline-flex size-9 items-center justify-center rounded-xl border border-[var(--fs-line)] md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-0.5 w-3.5 rounded bg-current" />
              <span className="block h-0.5 w-3.5 rounded bg-current" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--fs-line)] bg-white md:hidden">
          <nav className="flex flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={`m-${item.label}`}
                href={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-bold"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--fs-line)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
        <div className="sm:col-span-1">
          <div className="flex items-center gap-2.5">
            <FruitMark />
            <p className="text-lg font-extrabold">Fruit Shop</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fs-muted)]">
            Fresh and exotic fruit, packed with care and delivered to your door.
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-accent)]">Shop</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-[var(--fs-muted)]">
            <li>
              <Link href="/shop" className="hover:text-[var(--fs-accent)]">
                All fruit
              </Link>
            </li>
            <li>
              <Link href="/shop?featured=1" className="hover:text-[var(--fs-accent)]">
                Featured
              </Link>
            </li>
            <li>
              <Link href="/shop?organic=1" className="hover:text-[var(--fs-accent)]">
                Organic
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-accent)]">Account</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-[var(--fs-muted)]">
            <li>
              <Link href="/login" className="hover:text-[var(--fs-accent)]">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-[var(--fs-accent)]">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-[var(--fs-accent)]">
                Order history
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-[var(--fs-accent)]">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--fs-accent)]">Delivery</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-[var(--fs-muted)]">
            <li>Same-day in select cities</li>
            <li>Phone OTP login — no password</li>
            <li>Packed for freshness</li>
            <li>
              <Link href="/pages/about" className="hover:text-[var(--fs-accent)]">
                About us
              </Link>
            </li>
            <li>
              <Link href="/pages/shipping" className="hover:text-[var(--fs-accent)]">
                Shipping
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--fs-line)] bg-[var(--fs-mist)]/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs font-semibold text-[var(--fs-muted)] sm:flex-row sm:justify-between sm:px-6">
          <p>© {year} Fruit Shop. All rights reserved.</p>
          <p>Fresh · Seasonal · Delivered</p>
        </div>
      </div>
    </footer>
  );
}

export function StoreShell({ children }: { children: ReactNode; header?: string }) {
  return (
    <div className="fs-store-canvas flex min-h-dvh flex-col">
      <PromoBar />
      <SiteHeader />
      {children}
      <StoreFooter />
    </div>
  );
}

export const StoreHeader = () => null;
export function StoreChrome({ children }: { children: ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
