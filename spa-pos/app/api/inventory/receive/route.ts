// You can use this for:
// “Initial stock” (reason: "Initial stock").
// All future deliveries.
// You can let reception use this too (still safely logged who did it).

// app/api/inventory/receive/route.ts
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

// POST /api/inventory/receive
// body: { itemId, quantity, reason? }
// Use this for initial stock and deliveries.
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { itemId, quantity, reason } = body as {
      itemId?: string;
      quantity?: number;
      reason?: string;
    };

    if (!itemId || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "itemId and positive quantity are required" },
        { status: 400 }
      );
    }

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const previousQty = item.quantityOnHand ?? 0;
    const newQty = previousQty + quantity;

    item.quantityOnHand = newQty;
    item.lastUpdatedByUserId = user.userId;
    await item.save();

    const dateKey = getDateKey();
    await InventoryLog.create({
      itemId: item._id.toString(),
      dateKey,
      type: "received",
      previousQty,
      newQty,
      difference: quantity,
      reason: reason || "Received stock",
      createdByUserId: user.userId,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Inventory receive error:", error);
    return NextResponse.json(
      { error: "Failed to record received stock" },
      { status: 500 }
    );
  }
}
