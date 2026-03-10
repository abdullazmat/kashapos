import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReturnItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
}

export interface IReturn extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  returnNumber: string;
  type: "sales_return" | "purchase_return";
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  customerId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  items: IReturnItem[];
  subtotal: number;
  total: number;
  status: "pending" | "approved" | "completed" | "rejected";
  refundMethod?: "cash" | "credit" | "exchange";
  notes: string;
  processedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
  reason: { type: String, default: "" },
});

const ReturnSchema = new Schema<IReturn>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    returnNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ["sales_return", "purchase_return"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    referenceNumber: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    items: [ReturnItemSchema],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "rejected"],
      default: "pending",
    },
    refundMethod: {
      type: String,
      enum: ["cash", "credit", "exchange"],
    },
    notes: { type: String, default: "" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

ReturnSchema.index({ tenantId: 1, returnNumber: 1 }, { unique: true });
ReturnSchema.index({ tenantId: 1, type: 1 });

const Return: Model<IReturn> =
  mongoose.models.Return || mongoose.model<IReturn>("Return", ReturnSchema);
export default Return;
