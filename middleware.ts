import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // For now, we'll handle authentication in the client-side components
  // This middleware can be enhanced later with server-side session validation

  // Allow login page to be accessed without authentication
  if (req.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // For all other routes, let the client-side AuthProvider handle the redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
