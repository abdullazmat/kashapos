import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  notes: string;
  totalPurchases: number;
  totalSpent: number;
  outstandingBalance: number;
  creditLimit: number;
  paymentStatus: "cleared" | "partial" | "overdue";
  lastPaymentDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    taxId: { type: String },
    notes: { type: String, default: "" },
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["cleared", "partial", "overdue"],
      default: "cleared",
    },
    lastPaymentDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CustomerSchema.index({ tenantId: 1, phone: 1 });
CustomerSchema.index({ tenantId: 1, name: "text" });

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
