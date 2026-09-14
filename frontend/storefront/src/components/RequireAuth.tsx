"use client";

import { useAuth } from "@fruitshop/web-core";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

function AuthBootLoader({ label = "Loading account…" }: { label?: string }) {
  return (
    <div className="fs-store-canvas grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center" role="status" aria-label={label}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white shadow-[var(--fs-shadow-sm)] ring-1 ring-[var(--fs-line)]">
          <span className="size-5 animate-spin rounded-full border-2 border-[var(--fs-mist)] border-t-[var(--fs-accent)]" />
        </div>
        <p className="mt-4 text-sm font-bold text-[var(--fs-muted)]">{label}</p>
        <div className="mt-6 space-y-2">
          <div className="fs-skeleton mx-auto h-3 w-2/3" />
          <div className="fs-skeleton mx-auto h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!bootstrapping && !isAuthenticated) {
      const next = pathname && pathname !== "/account" ? pathname : "/account";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [bootstrapping, isAuthenticated, pathname, router]);

  if (bootstrapping) {
    return <AuthBootLoader />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
