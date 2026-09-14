import { ApiError, parseErrorMessage } from "./errors";
import type { RequestOptions, TokenPair } from "./types";
import { tokenStore } from "../auth/token-store";
import { toast } from "../toast/store";

export type ApiClientConfig = {
  baseUrl: string;
  /** Called when refresh fails — typically clear session + redirect */
  onUnauthorized?: () => void;
  /** Path used to rotate refresh tokens */
  refreshPath?: string;
};

type InternalConfig = Required<Pick<ApiClientConfig, "baseUrl" | "refreshPath">> &
  Pick<ApiClientConfig, "onUnauthorized">;

let config: InternalConfig = {
  baseUrl: "",
  refreshPath: "/auth/refresh",
};

let refreshPromise: Promise<boolean> | null = null;

export function configureApiClient(next: ApiClientConfig) {
  config = {
    baseUrl: next.baseUrl.replace(/\/$/, ""),
    refreshPath: next.refreshPath ?? "/auth/refresh",
    onUnauthorized: next.onUnauthorized,
  };
}

function buildUrl(path: string, params?: RequestOptions["params"]) {
  const base = config.baseUrl?.replace(/\/$/, "") || "http://localhost:8000";
  const url = new URL(
    path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;

  try {
    const res = await fetch(buildUrl(config.refreshPath), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenPair;
    tokenStore.setTokens(data.access_token, data.refresh_token, data.expires_in ?? 900);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    toastOnError = method !== "GET",
    successToast,
    signal,
    params,
  } = options;

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const access = tokenStore.getAccess();
    if (access) reqHeaders.Authorization = `Bearer ${access}`;
  }

  const execute = () =>
    fetch(buildUrl(path, params), {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

  let response = await execute();

  if (response.status === 401 && auth) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      const access = tokenStore.getAccess();
      if (access) reqHeaders.Authorization = `Bearer ${access}`;
      response = await execute();
    } else {
      tokenStore.clear();
      config.onUnauthorized?.();
    }
  }

  if (response.status === 204) {
    if (successToast) toast.success(successToast);
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const message = parseErrorMessage(response.status, data);
    if (toastOnError) toast.error(message);
    if (response.status === 401) config.onUnauthorized?.();
    throw new ApiError(response.status, message, data);
  }

  if (successToast) toast.success(successToast);
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Ergonomic helpers used by every module service */
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
