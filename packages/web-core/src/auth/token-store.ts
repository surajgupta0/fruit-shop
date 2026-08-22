const ACCESS_KEY = "fs_access_token";
const REFRESH_KEY = "fs_refresh_token";
const COOKIE_ACCESS = "fs_access_token";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!canUseDom()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (!canUseDom()) return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export const tokenStore = {
  getAccess(): string | null {
    if (!canUseDom()) return null;
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh(): string | null {
    if (!canUseDom()) return null;
    return localStorage.getItem(REFRESH_KEY);
  },

  setTokens(access: string, refresh: string, expiresInSeconds = 900) {
    if (!canUseDom()) return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    setCookie(COOKIE_ACCESS, access, expiresInSeconds);
  },

  clear() {
    if (!canUseDom()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    clearCookie(COOKIE_ACCESS);
  },

  /** Cookie name used by Next middleware */
  cookieName: COOKIE_ACCESS,
};
