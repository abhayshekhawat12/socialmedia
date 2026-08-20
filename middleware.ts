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

  // 2. Starting Root Route `/` -> Redirect to `/feed` (main app canvas)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // 3. Prevent already logged-in users from seeing /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
  }

  // 4. Public Social Routes (browseable by everyone without being blocked)
  const isPublicRoute =
    pathname.startsWith("/feed") ||
    pathname.startsWith("/pulse") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/trending") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/post") ||
    pathname.startsWith("/snap") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/development") ||
    pathname.startsWith("/hiring") ||
    pathname.startsWith("/camera") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/auth/callback");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 5. Private User Routes (require authentication)
  if (!isAuthenticated && (pathname.startsWith("/chats") || pathname.startsWith("/settings") || pathname.startsWith("/dashboard") || pathname.startsWith("/notifications"))) {
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
