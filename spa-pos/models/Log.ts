// models/Log.ts
import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILog extends Document {
  userId?: string;
  type: "auth" | "navigation" | "action" | "system";
  message: string;
  path?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>({
  userId: { type: String }, // string so we can store user _id as string
  type: {
    type: String,
    enum: ["auth", "navigation", "action", "system"],
    required: true,
  },
  message: { type: String, required: true },
  path: { type: String },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export const Log: Model<ILog> =
  mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema);
