export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

export type AuthUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
};

export type ApiErrorBody = {
  detail?: string | { msg?: string }[] | Record<string, unknown>;
  message?: string;
};

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Attach Bearer token (default true) */
  auth?: boolean;
  /** Show error toast (default: true for non-GET) */
  toastOnError?: boolean;
  /** Show success toast */
  successToast?: string;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | null | undefined>;
};
