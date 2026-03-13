import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockTransfer extends Document {
  tenantId: mongoose.Types.ObjectId;
  transferNumber: string;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    receivedQuantity: number;
  }[];
  status: "pending" | "in_transit" | "received" | "cancelled";
  transferDate: Date;
  transportedBy: string;
  receivedByName?: string;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    transferNumber: { type: String, required: true },
    fromBranchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        receivedQuantity: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in_transit", "received", "cancelled"],
      default: "in_transit",
    },
    transferDate: { type: Date, default: Date.now },
    transportedBy: { type: String, default: "" },
    receivedByName: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    receivedAt: { type: Date },
  },
  { timestamps: true },
);

StockTransferSchema.index({ tenantId: 1, transferNumber: 1 }, { unique: true });

const StockTransfer: Model<IStockTransfer> =
  mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>("StockTransfer", StockTransferSchema);
export default StockTransfer;
