import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockEntry extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStockEntry>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    quantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
  },
  { timestamps: true },
);

StockSchema.index({ tenantId: 1, productId: 1, branchId: 1 }, { unique: true });

const Stock: Model<IStockEntry> =
  mongoose.models.Stock || mongoose.model<IStockEntry>("Stock", StockSchema);
export default Stock;
