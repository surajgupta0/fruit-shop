/**
 * Next.js middleware helper — checks auth cookie presence.
 * Use from each app's middleware.ts.
 */
export function hasAccessCookie(cookieHeader: string | null, cookieName = "fs_access_token") {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => part.trim().startsWith(`${cookieName}=`));
}

export type GuardOptions = {
  /** Paths that never require auth (prefix match) */
  publicPaths?: string[];
  loginPath?: string;
  cookieName?: string;
};

export function shouldAllowRequest(
  pathname: string,
  cookieHeader: string | null,
  options: GuardOptions = {},
) {
  const {
    publicPaths = ["/login", "/_next", "/favicon.ico"],
    cookieName = "fs_access_token",
  } = options;

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { allow: true as const, redirect: null };
  }

  if (!hasAccessCookie(cookieHeader, cookieName)) {
    return { allow: false as const, redirect: options.loginPath ?? "/login" };
  }

  return { allow: true as const, redirect: null };
}
