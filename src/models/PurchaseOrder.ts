import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchaseOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
  total: number;
}

export interface IPurchaseOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  orderNumber: string;
  vendorId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  expectedDelivery?: Date;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    items: [PurchaseOrderItemSchema],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "ordered", "partial", "received", "cancelled"],
      default: "draft",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    amountPaid: { type: Number, default: 0 },
    expectedDelivery: { type: Date },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

PurchaseOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });

const PurchaseOrder: Model<IPurchaseOrder> =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
export default PurchaseOrder;
