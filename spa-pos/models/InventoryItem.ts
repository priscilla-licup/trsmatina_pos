// models/InventoryItem.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInventoryItem extends Document {
  name: string;
  sku: string;
  category: "oil" | "towel" | "disposable" | "drink" | "other";
  quantityOnHand: number;
  reorderLevel?: number;
  unitCost?: number;
  unitPrice?: number;
  isActive: boolean;
  lastUpdatedByUserId?: string;
  updatedAt: Date;
  createdAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ["oil", "towel", "disposable", "drink", "other"],
      default: "other",
    },
    quantityOnHand: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    unitCost: { type: Number },
    unitPrice: { type: Number },
    isActive: { type: Boolean, default: true },
    lastUpdatedByUserId: { type: String },
  },
  { timestamps: true }
);

export const InventoryItem: Model<IInventoryItem> =
  mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>("InventoryItem", InventoryItemSchema);
