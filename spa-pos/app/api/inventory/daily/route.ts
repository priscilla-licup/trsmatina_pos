// This is what your receptionist will use every night:
// Frontend on /pos/inventory/daily:
// Show important items with inputs for “Actual count”.
// Submit one payload: { counts: [...] }.

// Backend:
// Updates quantityOnHand.
// Saves a daily_count log per item.

// You later use InventoryLog to see:
// Differences
// Who encoded
// Per-day / per-week / per-month summary.

// app/api/inventory/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryLog } from "@/models/InventoryLog";
import { getDateKey } from "@/lib/dateKey";

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

// POST /api/inventory/daily
// body: { dateKey?, counts: [{ itemId, actualQty }] }
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const dateKey: string = body.dateKey || getDateKey();
    const counts: { itemId: string; actualQty: number }[] = body.counts ?? [];

    if (!Array.isArray(counts) || counts.length === 0) {
      return NextResponse.json(
        { error: "counts array is required" },
        { status: 400 }
      );
    }

    const results: { itemId: string; previousQty: number; newQty: number; difference: number }[] =
      [];

    for (const entry of counts) {
      const { itemId, actualQty } = entry;
      if (!itemId || typeof actualQty !== "number" || actualQty < 0) {
        continue;
      }

      const item = await InventoryItem.findById(itemId);
      if (!item) continue;

      const previousQty = item.quantityOnHand ?? 0;
      const newQty = actualQty;
      const difference = newQty - previousQty;

      if (difference !== 0) {
        item.quantityOnHand = newQty;
        item.lastUpdatedByUserId = user.userId;
        await item.save();
      }

      await InventoryLog.create({
        itemId: item._id.toString(),
        dateKey,
        type: "daily_count",
        previousQty,
        newQty,
        difference,
        reason: "End-of-day inventory count",
        createdByUserId: user.userId,
      });

      results.push({ itemId, previousQty, newQty, difference });
    }

    return NextResponse.json({ success: true, dateKey, results });
  } catch (error) {
    console.error("Inventory daily error:", error);
    return NextResponse.json(
      { error: "Failed to record daily inventory" },
      { status: 500 }
    );
  }
}
