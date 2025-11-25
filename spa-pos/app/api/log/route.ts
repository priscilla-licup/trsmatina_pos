// We’ll make a generic /api/log endpoint that:
// Reads the spa_auth cookie
// Gets userId from the JWT (if present)
// Writes a log via your writeLog helper

// app/api/log/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { writeLog } from "@/lib/log";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("spa_auth")?.value;
    let userId: string | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if (typeof decoded.sub === "string") {
          userId = decoded.sub;
        }
      } catch {
        // invalid token → just log without userId
      }
    }

    const body = await req.json();

    const type = body.type ?? "action";
    const message: string = body.message ?? "client log";
    const path: string | undefined = body.path;
    const meta: Record<string, unknown> | undefined = body.meta;

    await writeLog({
      userId,
      type,
      message,
      path,
      meta,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Log API error:", error);
    return NextResponse.json(
      { error: "Failed to write log" },
      { status: 500 }
    );
  }
}
