// models/Payroll.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayroll extends Document {
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  basicPay: number;
  overtimePay: number;
  commission: number;
  adjustments: number;
  totalPay: number;
  status: "draft" | "approved" | "paid";
  generatedByUserId: string;
  approvedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    staffId: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    basicPay: { type: Number, required: true, default: 0 },
    overtimePay: { type: Number, required: true, default: 0 },
    commission: { type: Number, required: true, default: 0 },
    adjustments: { type: Number, required: true, default: 0 },
    totalPay: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["draft", "approved", "paid"],
      default: "draft",
    },
    generatedByUserId: { type: String, required: true },
    approvedByUserId: { type: String },
  },
  { timestamps: true }
);

export const Payroll: Model<IPayroll> =
  mongoose.models.Payroll ||
  mongoose.model<IPayroll>("Payroll", PayrollSchema);
