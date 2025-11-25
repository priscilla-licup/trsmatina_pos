// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { Transaction, ITransaction, ServiceStatus, PaymentStatus } from "@/models/Transaction";
import { getBusinessDateKey } from "@/lib/businessDate";
import { writeLog } from "@/lib/log";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

type Role = "admin" | "staff";

function getUserFromRequest(req: NextRequest): { userId: string; role: Role } | null {
  const token = req.cookies.get("spa_auth")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = typeof decoded.sub === "string" ? decoded.sub : "";
    const role = decoded.role as Role | undefined;
    if (!userId || !role) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

// GET /api/transactions?scope=active|today|history&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? "active";

    const now = new Date();
    const currentBusinessDateKey = getBusinessDateKey(now);

    let query: Record<string, unknown> = {};
    let limit = 100;

    if (scope === "active") {
      // Ongoing / done but unpaid for current business day
      query = {
        businessDateKey: currentBusinessDateKey,
        serviceStatus: { $in: ["ongoing", "done"] },
        paymentStatus: { $ne: "paid" },
      };
      limit = 100;
    } else if (scope === "today") {
      // All for current business day
      query = {
        businessDateKey: currentBusinessDateKey,
      };
      limit = 200;
    } else if (scope === "history") {
      // Admin only
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Only admin can view transaction history" },
          { status: 403 }
        );
      }

      const from = searchParams.get("from");
      const to = searchParams.get("to");

      const dateFilter: Record<string, unknown> = {};
      if (from) {
        dateFilter.$gte = from;
      }
      if (to) {
        dateFilter.$lte = to;
      }

      query = Object.keys(dateFilter).length
        ? { businessDateKey: dateFilter }
        : {};
      limit = 500;
    } else {
      return NextResponse.json(
        { error: "Invalid scope parameter" },
        { status: 400 }
      );
    }

    const transactions: ITransaction[] = await Transaction.find(query)
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Transactions GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST /api/transactions → create new transaction
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();

    const {
      guestName,
      // For now we let startedAt be optional; staff can't backdate, admin can
      startedAt: startedAtRaw,
      services,
      therapistId,
      therapistName,
      roomName,
      notes,
    } = body as {
      guestName?: string;
      startedAt?: string | Date;
      services?: { serviceName: string; durationMinutes?: number; amount: number }[];
      therapistId?: string;
      therapistName?: string;
      roomName?: string;
      notes?: string;
    };

    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json(
        { error: "At least one service is required" },
        { status: 400 }
      );
    }

    const totalAmount = services.reduce(
      (sum, s) => sum + (typeof s.amount === "number" ? s.amount : 0),
      0
    );

    // Determine startedAt + businessDateKey
    let startedAt = new Date();
    if (user.role === "admin" && startedAtRaw) {
      // Admin allowed to backdate if they supply a valid startedAt
      const candidate = new Date(startedAtRaw);
      if (!Number.isNaN(candidate.getTime())) {
        startedAt = candidate;
      }
    }

    const businessDateKey = getBusinessDateKey(startedAt);

    // Reception can only create for "current business date"
    const currentBusinessDateKey = getBusinessDateKey(new Date());
    if (user.role === "staff" && businessDateKey !== currentBusinessDateKey) {
      return NextResponse.json(
        {
          error:
            "Staff can only create transactions for the current business day.",
        },
        { status: 403 }
      );
    }

    const transaction = await Transaction.create({
      businessDateKey,
      startedAt,
      guestName: guestName?.trim() || undefined,
      services,
      totalAmount,
      therapistId,
      therapistName,
      roomName,
      notes,
      serviceStatus: "ongoing",
      paymentStatus: "unpaid",
      createdByUserId: user.userId,
    });

    // Log
    await writeLog({
      userId: user.userId,
      type: "action",
      message: `Created transaction ${transaction._id} (₱${totalAmount.toFixed(
        2
      )})`,
      path: "/api/transactions",
      meta: {
        transactionId: transaction._id.toString(),
        businessDateKey,
        totalAmount,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Transactions POST error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
