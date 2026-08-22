"use client";

import { useEffect, type ReactNode } from "react";

import { configureApiClient } from "../api/client";
import { AuthProvider } from "../auth/AuthProvider";
import { tokenStore } from "../auth/token-store";
import { ToastViewport } from "../toast/ToastViewport";

export type AppProvidersProps = {
  children: ReactNode;
  /** API origin, e.g. http://localhost:8000 */
  apiBaseUrl: string;
  loginPath?: string;
  mePath?: string;
  loginApiPath?: string;
};

/**
 * Single entry provider for every Fruit Shop frontend app.
 * Wraps: API config + auth session + toasts.
 */
export function AppProviders({
  children,
  apiBaseUrl,
  loginPath = "/login",
  mePath = "/users/me",
  loginApiPath = "/auth/login",
}: AppProvidersProps) {
  useEffect(() => {
    configureApiClient({
      baseUrl: apiBaseUrl,
      onUnauthorized: () => {
        tokenStore.clear();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith(loginPath)) {
          window.location.assign(loginPath);
        }
      },
    });
  }, [apiBaseUrl, loginPath]);

  return (
    <AuthProvider loginPath={loginPath} mePath={mePath} loginApiPath={loginApiPath}>
      {children}
      <ToastViewport />
    </AuthProvider>
  );
}
