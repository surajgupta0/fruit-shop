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
  /**
   * Called when refresh fails. Default: clear tokens and go to loginPath.
   * Storefront can keep shoppers on public pages instead of forcing login.
   */
  onUnauthorized?: () => void;
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
  onUnauthorized,
}: AppProvidersProps) {
  useEffect(() => {
    configureApiClient({
      baseUrl: apiBaseUrl,
      onUnauthorized:
        onUnauthorized ??
        (() => {
          tokenStore.clear();
          if (typeof window !== "undefined" && !window.location.pathname.startsWith(loginPath)) {
            window.location.assign(loginPath);
          }
        }),
    });
  }, [apiBaseUrl, loginPath, onUnauthorized]);

  return (
    <AuthProvider loginPath={loginPath} mePath={mePath} loginApiPath={loginApiPath}>
      {children}
      <ToastViewport />
    </AuthProvider>
  );
}
