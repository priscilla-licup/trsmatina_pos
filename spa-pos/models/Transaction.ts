// models/Transaction.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export type ServiceStatus = "ongoing" | "done" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "complimentary";

export interface ITransactionService {
  serviceName: string;
  durationMinutes?: number;
  amount: number; // amount for this service
}

export interface ITransaction extends Document {
  businessDateKey: string; // "YYYY-MM-DD" using spa business day rule
  startedAt: Date;
  guestName?: string;

  services: ITransactionService[];
  totalAmount: number;

  therapistId?: string;
  therapistName?: string;
  roomName?: string;

  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: "cash" | "gcash" | "card" | "other";

  notes?: string;

  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionServiceSchema = new Schema<ITransactionService>({
  serviceName: { type: String, required: true },
  durationMinutes: { type: Number },
  amount: { type: Number, required: true },
});

const TransactionSchema = new Schema<ITransaction>(
  {
    businessDateKey: { type: String, required: true }, // business day
    startedAt: { type: Date, required: true, default: Date.now },

    guestName: { type: String },

    services: {
      type: [TransactionServiceSchema],
      default: [],
      validate: {
        validator: (arr: ITransactionService[]) => arr.length > 0,
        message: "At least one service is required",
      },
    },

    totalAmount: { type: Number, required: true },

    therapistId: { type: String },
    therapistName: { type: String },
    roomName: { type: String },

    serviceStatus: {
      type: String,
      enum: ["ongoing", "done", "cancelled"],
      default: "ongoing",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "complimentary"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "card", "other"],
    },

    notes: { type: String },

    createdByUserId: { type: String, required: true },
  },
  { timestamps: true }
);

// Index for business-date based queries
TransactionSchema.index({ businessDateKey: 1, startedAt: 1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
