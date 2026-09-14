"use client";

import { useAuth } from "@fruitshop/web-core";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

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
    return (
      <div className="fs-store-canvas grid min-h-dvh place-items-center text-sm text-[var(--fs-muted)]">
        Loading account…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
