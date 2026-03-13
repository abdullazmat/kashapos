import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockAdjustment extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  toBranchId?: mongoose.Types.ObjectId;
  type:
    | "addition"
    | "subtraction"
    | "transfer"
    | "return"
    | "damage"
    | "correction"
    | "stock_in"
    | "stock_out"
    | "transfer_in"
    | "transfer_out"
    | "count_correction"
    | "return_to_supplier";
  quantity: number;
  currentQty?: number;
  newQty?: number;
  reason: string;
  reference?: string;
  notes?: string;
  performedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  adjustmentDate?: Date;
  linkedTransferId?: mongoose.Types.ObjectId;
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
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    type: {
      type: String,
      enum: [
        "addition",
        "subtraction",
        "transfer",
        "return",
        "damage",
        "correction",
        "stock_in",
        "stock_out",
        "transfer_in",
        "transfer_out",
        "count_correction",
        "return_to_supplier",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    currentQty: { type: Number, default: 0 },
    newQty: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    reference: { type: String },
    notes: { type: String, default: "" },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adjustmentDate: { type: Date, default: Date.now },
    linkedTransferId: { type: Schema.Types.ObjectId, ref: "StockTransfer" },
  },
  { timestamps: true },
);

StockAdjustmentSchema.index({ tenantId: 1, productId: 1 });

const StockAdjustment: Model<IStockAdjustment> =
  mongoose.models.StockAdjustment ||
  mongoose.model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);
export default StockAdjustment;
