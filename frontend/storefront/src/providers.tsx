"use client";

import { AppProviders as CoreProviders, tokenStore } from "@fruitshop/web-core";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").trim() || "http://localhost:8000";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CoreProviders
      apiBaseUrl={API_BASE}
      loginPath="/login"
      onUnauthorized={() => {
        tokenStore.clear();
        if (typeof window === "undefined") return;
        const path = window.location.pathname;
        // Only force login for private customer pages
        if (
          path === "/account" ||
          path.startsWith("/account/") ||
          path === "/cart" ||
          path === "/checkout"
        ) {
          window.location.assign(`/login?next=${encodeURIComponent(path)}`);
        }
      }}
    >
      {children}
    </CoreProviders>
  );
}
