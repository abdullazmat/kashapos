import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomerPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  saleId?: mongoose.Types.ObjectId;
  amount: number;
  method:
    | "cash"
    | "card"
    | "mobile_money"
    | "bank_transfer"
    | "split"
    | "credit"
    | "other";
  reference?: string;
  notes?: string;
  balanceBefore: number;
  balanceAfter: number;
  recordedBy?: mongoose.Types.ObjectId;
  recordedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: [
        "cash",
        "card",
        "mobile_money",
        "bank_transfer",
        "split",
        "credit",
        "other",
      ],
      default: "cash",
    },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    recordedByName: { type: String, default: "" },
  },
  { timestamps: true },
);

CustomerPaymentSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

const CustomerPayment: Model<ICustomerPayment> =
  mongoose.models.CustomerPayment ||
  mongoose.model<ICustomerPayment>("CustomerPayment", CustomerPaymentSchema);

export default CustomerPayment;
