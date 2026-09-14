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
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<AuthUser>;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string, name?: string) => Promise<AuthUser>;
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
  otpRequestPath?: string;
  otpVerifyPath?: string;
  emailOtpRequestPath?: string;
  emailOtpVerifyPath?: string;
};

export function AuthProvider({
  children,
  loginPath = "/login",
  mePath = "/users/me",
  loginApiPath = "/auth/login",
  otpRequestPath = "/auth/otp/request",
  otpVerifyPath = "/auth/otp/verify",
  emailOtpRequestPath = "/auth/otp/email/request",
  emailOtpVerifyPath = "/auth/otp/email/verify",
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

  const applyTokens = useCallback(
    async (tokens: TokenPair) => {
      tokenStore.setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in ?? 900);
      const me = await api.get<AuthUser>(mePath);
      setUser(me);
      return me;
    },
    [mePath],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<TokenPair>(
        loginApiPath,
        { email, password },
        { auth: false, successToast: "Signed in" },
      );
      return applyTokens(tokens);
    },
    [loginApiPath, applyTokens],
  );

  const requestOtp = useCallback(
    async (phone: string) => {
      await api.post<void>(
        otpRequestPath,
        { phone },
        { auth: false, successToast: "OTP sent" },
      );
    },
    [otpRequestPath],
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string, name?: string) => {
      const tokens = await api.post<TokenPair>(
        otpVerifyPath,
        { phone, code, ...(name?.trim() ? { name: name.trim() } : {}) },
        { auth: false, successToast: "Welcome" },
      );
      return applyTokens(tokens);
    },
    [otpVerifyPath, applyTokens],
  );

  const requestEmailOtp = useCallback(
    async (email: string) => {
      await api.post<void>(
        emailOtpRequestPath,
        { email: email.trim().toLowerCase() },
        { auth: false, successToast: "Code sent to your email" },
      );
    },
    [emailOtpRequestPath],
  );

  const verifyEmailOtp = useCallback(
    async (email: string, code: string, name?: string) => {
      const tokens = await api.post<TokenPair>(
        emailOtpVerifyPath,
        {
          email: email.trim().toLowerCase(),
          code,
          ...(name?.trim() ? { name: name.trim() } : {}),
        },
        { auth: false, successToast: "Welcome" },
      );
      return applyTokens(tokens);
    },
    [emailOtpVerifyPath, applyTokens],
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
      requestOtp,
      verifyOtp,
      requestEmailOtp,
      verifyEmailOtp,
      logout,
      refreshMe,
      hasPermission: (permission) =>
        Boolean(user?.permissions?.some((p) => p === permission)),
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, bootstrapping, login, requestOtp, verifyOtp, requestEmailOtp, verifyEmailOtp, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
