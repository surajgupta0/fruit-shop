"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "../api/client";
import type { AuthUser, TokenPair } from "../api/types";
import { tokenStore } from "./token-store";

type AuthState = {
  user: AuthUser | null;
  bootstrapping: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<AuthUser | null>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  loginPath?: string;
  mePath?: string;
  loginApiPath?: string;
};

export function AuthProvider({
  children,
  loginPath = "/login",
  mePath = "/users/me",
  loginApiPath = "/auth/login",
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.get<AuthUser>(mePath, { toastOnError: false });
      setUser(me);
      return me;
    } catch {
      tokenStore.clear();
      setUser(null);
      return null;
    }
  }, [mePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshMe();
      if (!cancelled) setBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<TokenPair>(
        loginApiPath,
        { email, password },
        { auth: false, successToast: "Signed in" },
      );
      tokenStore.setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in ?? 900);
      const me = await api.get<AuthUser>(mePath);
      setUser(me);
      return me;
    },
    [loginApiPath, mePath],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.assign(loginPath);
    }
  }, [loginPath]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      bootstrapping,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshMe,
      hasPermission: (permission) => Boolean(user?.permissions?.includes(permission)),
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, bootstrapping, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
