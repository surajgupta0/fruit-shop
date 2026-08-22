"use client";

import Link from "next/link";
import { useAuth } from "@fruitshop/web-core";
import type { ReactNode } from "react";

import { Surface } from "@/src/console/ui";

type Props = {
  /** Single required permission */
  permission?: string;
  /** Pass if any one of these is enough */
  anyOf?: string[];
  /** Pass if all of these are required */
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

function Denied({ codes }: { codes: string[] }) {
  return (
    <Surface padded className="max-w-lg border-[var(--fs-warn)]/30 bg-[var(--fs-warn-bg)]">
      <p className="font-medium text-[var(--fs-ink)]">You don’t have access to this panel.</p>
      <p className="mt-1 text-sm text-[var(--fs-warn)]">
        Required: {codes.join(" or ")}
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-sm font-medium text-[var(--fs-leaf)] hover:underline"
      >
        Back to overview
      </Link>
    </Surface>
  );
}

export function RequirePermission({
  permission,
  anyOf,
  allOf,
  children,
  fallback,
}: Props) {
  const { hasPermission, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <p className="text-sm text-[var(--fs-muted)]">Checking access…</p>;
  }

  const codes =
    anyOf?.length ? anyOf : allOf?.length ? allOf : permission ? [permission] : [];

  let allowed = true;
  if (anyOf?.length) {
    allowed = anyOf.some((p) => hasPermission(p));
  } else if (allOf?.length) {
    allowed = allOf.every((p) => hasPermission(p));
  } else if (permission) {
    allowed = hasPermission(permission);
  }

  if (!allowed) {
    return fallback ?? <Denied codes={codes} />;
  }

  return <>{children}</>;
}

/** Inline gate — renders children only when permission checks pass. */
export function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, bootstrapping } = useAuth();
  if (bootstrapping) return null;

  let allowed = true;
  if (anyOf?.length) allowed = anyOf.some((p) => hasPermission(p));
  else if (allOf?.length) allowed = allOf.every((p) => hasPermission(p));
  else if (permission) allowed = hasPermission(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
