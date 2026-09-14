"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim();
  return trimmed || "http://localhost:8000";
}

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
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  // Configure synchronously so child useQuery effects never run with an empty base URL.
  configureApiClient({
    baseUrl: normalizeApiBaseUrl(apiBaseUrl),
    onUnauthorized: () => {
      const handler = onUnauthorizedRef.current;
      if (handler) {
        handler();
        return;
      }
      tokenStore.clear();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith(loginPath)) {
        window.location.assign(loginPath);
      }
    },
  });

  useEffect(() => {
    configureApiClient({
      baseUrl: normalizeApiBaseUrl(apiBaseUrl),
      onUnauthorized: () => {
        const handler = onUnauthorizedRef.current;
        if (handler) {
          handler();
          return;
        }
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
