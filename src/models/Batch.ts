import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBatchItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  remainingQty: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate?: Date;
}

export interface IBatch extends Document {
  tenantId: mongoose.Types.ObjectId;
  batchNumber: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  items: IBatchItem[];
  receivedDate: Date;
  notes?: string;
  status: "active" | "depleted" | "expired";
  createdAt: Date;
  updatedAt: Date;
}

const BatchItemSchema = new Schema<IBatchItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    remainingQty: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date },
  },
  { _id: false },
);

const BatchSchema = new Schema<IBatch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    batchNumber: { type: String, required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    items: {
      type: [BatchItemSchema],
      validate: {
        validator: (items: IBatchItem[]) =>
          Array.isArray(items) && items.length > 0,
        message: "A batch must contain at least one item",
      },
    },
    receivedDate: { type: Date, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "depleted", "expired"],
      default: "active",
    },
  },
  { timestamps: true },
);

BatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true });
BatchSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);

export default Batch;
