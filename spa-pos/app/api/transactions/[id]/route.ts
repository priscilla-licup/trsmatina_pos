// Role behavior baked in:

// Reception (staff):
// Can update today’s transactions only (current business day).

// Can change:
// serviceStatus (ongoing ↔ done ↔ cancelled)
// paymentStatus (unpaid → paid / complimentary)
// paymentMethod
// therapistName, roomName, notes, guestName

// Cannot:
// Edit past days
// Change totalAmount
// Revert paid/complimentary → unpaid

// Admin:
// Can update any date
// Can change totals, statuses, etc. (within validation rules)

// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import {
  Transaction,
  ITransaction,
  ServiceStatus,
  PaymentStatus,
} from "@/models/Transaction";
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

// ⬇️ NOTE: params is now a Promise and must be awaited
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    // ✅ await params here
    const { id } = await context.params;

    const existing = (await Transaction.findById(id)) as ITransaction | null;

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const currentBusinessDateKey = getBusinessDateKey(new Date());

    // Staff can only update transactions for current business day
    if (user.role === "staff" && existing.businessDateKey !== currentBusinessDateKey) {
      return NextResponse.json(
        {
          error:
            "Staff can only modify transactions from the current business day.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updates: Partial<ITransaction> = {};

    // Service status (both roles allowed, same business day)
    if (body.serviceStatus) {
      const allowedService: ServiceStatus[] = ["ongoing", "done", "cancelled"];
      if (!allowedService.includes(body.serviceStatus)) {
        return NextResponse.json(
          { error: "Invalid serviceStatus" },
          { status: 400 }
        );
      }
      updates.serviceStatus = body.serviceStatus;
    }

    // Payment status
    if (body.paymentStatus) {
      const allowedPayment: PaymentStatus[] = [
        "unpaid",
        "paid",
        "complimentary",
      ];
      if (!allowedPayment.includes(body.paymentStatus)) {
        return NextResponse.json(
          { error: "Invalid paymentStatus" },
          { status: 400 }
        );
      }

      // Staff cannot revert paid/complimentary back to unpaid
      if (
        user.role === "staff" &&
        (existing.paymentStatus === "paid" ||
          existing.paymentStatus === "complimentary") &&
        body.paymentStatus === "unpaid"
      ) {
        return NextResponse.json(
          {
            error:
              "Staff cannot revert a paid or complimentary transaction back to unpaid.",
          },
          { status: 403 }
        );
      }

      updates.paymentStatus = body.paymentStatus;
    }

    // Payment method
    if (body.paymentMethod) {
      const allowedMethods = ["cash", "gcash", "card", "other"];
      if (!allowedMethods.includes(body.paymentMethod)) {
        return NextResponse.json(
          { error: "Invalid paymentMethod" },
          { status: 400 }
        );
      }
      updates.paymentMethod = body.paymentMethod;
    }

    // Editable fields for both roles, same day:
    if (typeof body.therapistName === "string") {
      updates.therapistName = body.therapistName;
    }
    if (typeof body.roomName === "string") {
      updates.roomName = body.roomName;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes;
    }
    if (typeof body.guestName === "string") {
      updates.guestName = body.guestName;
    }

    // Amount/total change → admin only
    if (typeof body.totalAmount === "number") {
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Only admin can change transaction total amount" },
          { status: 403 }
        );
      }
      updates.totalAmount = body.totalAmount;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    Object.assign(existing, updates);
    await existing.save();

    await writeLog({
      userId: user.userId,
      type: "action",
      message: `Updated transaction ${existing._id}`,
      path: `/api/transactions/${existing._id}`,
      meta: {
        updates,
      },
    });

    return NextResponse.json({ transaction: existing });
  } catch (error) {
    console.error("Transactions PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
