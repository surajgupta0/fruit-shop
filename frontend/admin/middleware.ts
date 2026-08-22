import { NextResponse, type NextRequest } from "next/server";
import { shouldAllowRequest } from "@fruitshop/web-core";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const result = shouldAllowRequest(pathname, request.headers.get("cookie"), {
    publicPaths: ["/login", "/_next", "/favicon.ico"],
    loginPath: "/login",
  });

  if (!result.allow && result.redirect) {
    const url = request.nextUrl.clone();
    url.pathname = result.redirect;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in visiting /login → send to dashboard
  if (pathname === "/login" && shouldAllowRequest("/dashboard", request.headers.get("cookie")).allow) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
