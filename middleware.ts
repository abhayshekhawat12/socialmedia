import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/uploads") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("block_social_jwt")?.value;
  const isAuthenticated = Boolean(token && token.length > 10);

  // 2. Starting Root Route `/`
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Prevent logged-in users from seeing /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
  }

  // 4. OAuth callback route is public
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // 5. Protected Routes: Require active authentication
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
