// models/User.ts
import mongoose, { Schema, Model, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: "admin" | "staff";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  createdAt: { type: Date, default: Date.now },
});

// Avoid model overwrite in dev (Next hot reload)
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
