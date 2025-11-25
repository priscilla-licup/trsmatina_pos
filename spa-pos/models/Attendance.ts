// models/Attendance.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAttendance extends Document {
  userId: string;
  dateKey: string; // e.g. "2025-11-25"
  timeIn?: Date;
  timeOut?: Date;
  source: "pos" | "manual";
  createdByUserId: string;
  updatedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: String, required: true },
    dateKey: { type: String, required: true }, // we can index this later
    timeIn: { type: Date },
    timeOut: { type: Date },
    source: { type: String, enum: ["pos", "manual"], default: "pos" },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
