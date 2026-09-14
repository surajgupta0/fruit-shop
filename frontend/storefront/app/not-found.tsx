import Link from "next/link";

import { StoreShell } from "@/src/components/StoreChrome";

export default function NotFound() {
  return (
    <StoreShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="fs-eyebrow">404</p>
        <h1 className="fs-section-title mt-2 text-3xl sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-sm font-medium text-[var(--fs-muted)]">
          That link doesn’t lead to any fruit on our shelves.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="fs-btn-primary">
            Browse shop
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[var(--fs-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--fs-ink)] hover:bg-[var(--fs-mist)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
