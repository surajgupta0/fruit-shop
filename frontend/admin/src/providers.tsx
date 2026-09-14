"use client";

import { configureApiClient, AppProviders as CoreProviders, tokenStore } from "@fruitshop/web-core";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").trim() || "http://localhost:8000";
const LOGIN_PATH = "/login";

configureApiClient({
  baseUrl: API_BASE,
  onUnauthorized: () => {
    tokenStore.clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith(LOGIN_PATH)) {
      window.location.assign(LOGIN_PATH);
    }
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CoreProviders apiBaseUrl={API_BASE} loginPath={LOGIN_PATH}>
      {children}
    </CoreProviders>
  );
}
