import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITillSession extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  tillName: string;
  cashierId?: mongoose.Types.ObjectId;
  cashierName: string;
  openingFloat: number;
  closingCashCount: number;
  expectedCash: number;
  variance: number;
  varianceReason?: string;
  status: "closed";
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TillSessionSchema = new Schema<ITillSession>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    tillName: { type: String, required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
    cashierName: { type: String, required: true },
    openingFloat: { type: Number, required: true, default: 0 },
    closingCashCount: { type: Number, required: true, default: 0 },
    expectedCash: { type: Number, required: true, default: 0 },
    variance: { type: Number, required: true, default: 0 },
    varianceReason: { type: String, default: "" },
    status: { type: String, enum: ["closed"], default: "closed" },
    closedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

TillSessionSchema.index({ tenantId: 1, createdAt: -1 });

const TillSession: Model<ITillSession> =
  mongoose.models.TillSession ||
  mongoose.model<ITillSession>("TillSession", TillSessionSchema);

export default TillSession;
