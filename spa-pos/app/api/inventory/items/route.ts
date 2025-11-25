// Reception: can call GET (view list).
// Admin: can call POST (create new items).

// app/api/inventory/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { InventoryItem } from "@/models/InventoryItem";

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

// GET /api/inventory/items  → list items
export async function GET() {
  try {
    await connectToDatabase();

    const items = await InventoryItem.find({}).sort({ name: 1 }).lean();

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/items  → create new item (admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can create inventory items" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { name, sku, category, quantityOnHand, reorderLevel } = body;

    if (!name || !sku) {
      return NextResponse.json(
        { error: "Name and SKU are required" },
        { status: 400 }
      );
    }

    const existing = await InventoryItem.findOne({ sku }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An item with this SKU already exists" },
        { status: 400 }
      );
    }

    const item = await InventoryItem.create({
      name,
      sku,
      category: category ?? "other",
      quantityOnHand: quantityOnHand ?? 0,
      reorderLevel: reorderLevel ?? 0,
      lastUpdatedByUserId: user.userId,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
