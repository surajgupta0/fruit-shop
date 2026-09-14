import { NextResponse, type NextRequest } from "next/server";
import { hasAccessCookie } from "@fruitshop/web-core";

/** Customer account + checkout require OTP session; login/signup always public. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasAccessCookie(request.headers.get("cookie"));

  const isProtected =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/cart" ||
    pathname === "/checkout";

  if (isProtected && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
