import { NextResponse, type NextRequest } from "next/server";
import { hasAccessCookie } from "@fruitshop/web-core";

/** Customer account requires OTP session; shop + auth pages stay public. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasAccessCookie(request.headers.get("cookie"));

  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAccount && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
