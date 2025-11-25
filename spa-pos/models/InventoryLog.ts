// This is where we store:
// initial stocks (as received with reason "Initial stock")
// daily end-of-day counts (daily_count)
// manual corrections (adjustment if ever needed)

// models/InventoryLog.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export type InventoryLogType = "received" | "daily_count" | "adjustment";

export interface IInventoryLog extends Document {
  itemId: string;
  dateKey: string; // e.g. "2025-11-25"
  type: InventoryLogType;
  previousQty: number;
  newQty: number;
  difference: number; // newQty - previousQty
  reason?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    itemId: { type: String, required: true },
    dateKey: { type: String, required: true },
    type: {
      type: String,
      enum: ["received", "daily_count", "adjustment"],
      required: true,
    },
    previousQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    difference: { type: Number, required: true },
    reason: { type: String },
    createdByUserId: { type: String, required: true },
  },
  { timestamps: true }
);

// Helpful for per-item history queries
InventoryLogSchema.index({ itemId: 1, dateKey: 1, type: 1 });

export const InventoryLog: Model<IInventoryLog> =
  mongoose.models.InventoryLog ||
  mongoose.model<IInventoryLog>("InventoryLog", InventoryLogSchema);
