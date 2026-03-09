import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockAdjustment extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  type:
    | "addition"
    | "subtraction"
    | "transfer"
    | "return"
    | "damage"
    | "correction";
  quantity: number;
  reason: string;
  reference?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    type: {
      type: String,
      enum: [
        "addition",
        "subtraction",
        "transfer",
        "return",
        "damage",
        "correction",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    reason: { type: String, default: "" },
    reference: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

StockAdjustmentSchema.index({ tenantId: 1, productId: 1 });

const StockAdjustment: Model<IStockAdjustment> =
  mongoose.models.StockAdjustment ||
  mongoose.model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);
export default StockAdjustment;
