"use client";

import { configureApiClient, AppProviders as CoreProviders } from "@fruitshop/web-core";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

configureApiClient({ baseUrl: API_BASE });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CoreProviders apiBaseUrl={API_BASE} loginPath="/login">
      {children}
    </CoreProviders>
  );
}
