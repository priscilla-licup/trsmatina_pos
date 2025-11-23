// middleware.ts
/*
Any visit to /pos, /pos/dashboard, /pos/whatever:
- Checks the spa_auth cookie
- Verifies JWT
- If invalid/missing → redirects to /login */
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /pos routes
  if (pathname.startsWith("/pos")) {
    const token = req.cookies.get("spa_auth")?.value;

    if (!token || !JWT_SECRET) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      jwt.verify(token, JWT_SECRET);
      // If token is valid, continue to /pos page
      return NextResponse.next();
    } catch {
      // Invalid or expired token → go to login
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // For all other routes, do nothing special
  return NextResponse.next();
}

// Tell Next.js which routes this applies to
export const config = {
  matcher: ["/pos/:path*"],
};
