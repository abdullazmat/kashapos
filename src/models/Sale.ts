import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  tax: number;
  total: number;
}

export interface ISale extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderNumber: string;
  customerId?: mongoose.Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate?: Date;
  creditNote?: string;
  paymentStatus: "cleared" | "partial" | "overdue";
  paymentMethod:
    | "cash"
    | "card"
    | "mobile_money"
    | "split"
    | "credit"
    | "bank_transfer";
  paymentDetails: {
    cashAmount?: number;
    cardAmount?: number;
    mobileMoneyAmount?: number;
    mobileMoneyProvider?: "mtn" | "airtel";
    mobileMoneyRef?: string;
    changeGiven?: number;
  };
  status: "completed" | "pending" | "refunded" | "voided";
  notes: string;
  cashierId: mongoose.Types.ObjectId;
  registerId?: string;
  receiptSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    default: "fixed",
  },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const SaleSchema = new Schema<ISale>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    dueDate: { type: Date },
    creditNote: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["cleared", "partial", "overdue"],
      default: "cleared",
    },
    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "card",
        "mobile_money",
        "split",
        "credit",
        "bank_transfer",
      ],
      default: "cash",
    },
    paymentDetails: {
      cashAmount: { type: Number },
      cardAmount: { type: Number },
      mobileMoneyAmount: { type: Number },
      mobileMoneyProvider: { type: String, enum: ["mtn", "airtel"] },
      mobileMoneyRef: { type: String },
      changeGiven: { type: Number },
    },
    status: {
      type: String,
      enum: ["completed", "pending", "refunded", "voided"],
      default: "completed",
    },
    notes: { type: String, default: "" },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    registerId: { type: String },
    receiptSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

SaleSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
SaleSchema.index({ tenantId: 1, createdAt: -1 });
SaleSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });

const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);
export default Sale;
