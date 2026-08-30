import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "its_token";

function isLoggedIn(request: NextRequest): boolean {
  return Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPrefixes = ["/dashboard", "/admin"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
