"use client";

import Link from "next/link";
import { useAuth } from "@fruitshop/web-core";
import type { ReactNode } from "react";

type Props = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequirePermission({ permission, children, fallback }: Props) {
  const { hasPermission, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <p className="text-sm text-stone-500">Checking access…</p>;
  }

  if (!hasPermission(permission)) {
    return (
      fallback ?? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-medium">You don’t have permission for this panel.</p>
          <p className="mt-1 text-amber-800/80">Required: {permission}</p>
          <Link href="/" className="mt-4 inline-block text-[var(--fs-leaf)] hover:underline">
            Back to overview
          </Link>
        </div>
      )
    );
  }

  return <>{children}</>;
}
