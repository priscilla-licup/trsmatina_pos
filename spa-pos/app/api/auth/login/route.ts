// app/api/auth/login/route.ts
/**
This:
- Checks credentials
- Uses bcrypt to compare password
- Creates a JWT
- Sets a httpOnly cookie called spa_auth
- Logs success/failure into Log
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { writeLog } from "@/lib/log";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ username });
    if (!user) {
      await writeLog({
        type: "auth",
        message: `Failed login (user not found): ${username}`,
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await writeLog({
        userId: user._id.toString(),
        type: "auth",
        message: `Failed login (wrong password): ${username}`,
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Build token payload
    const tokenPayload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });

    await writeLog({
      userId: user._id.toString(),
      type: "auth",
      message: `User logged in: ${user.username}`,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set("spa_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
