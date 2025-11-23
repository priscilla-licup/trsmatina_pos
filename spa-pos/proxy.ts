// middleware.ts
/*
Any visit to /pos, /pos/dashboard, /pos/whatever:
- Checks the spa_auth cookie
- Verifies JWT
- If invalid/missing → redirects to /login */
// proxy.ts
// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/pos")) {
    const token = req.cookies.get("spa_auth")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*"],
};
