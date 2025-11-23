// app/api/auth/logout/route.ts
/*
So when your frontend calls POST /api/auth/logout, it:
- Clears the cookie
- Logs the logout event
*/
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { writeLog } from "@/lib/log";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("spa_auth")?.value;
    let userId: string | undefined;
    let username: string | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        userId = typeof decoded.sub === "string" ? decoded.sub : undefined;
        username =
          typeof decoded.username === "string" ? decoded.username : undefined;
      } catch {
        // ignore invalid token
      }
    }

    if (username || userId) {
      await writeLog({
        userId,
        type: "auth",
        message: `User logged out${username ? `: ${username}` : ""}`,
      });
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set("spa_auth", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
