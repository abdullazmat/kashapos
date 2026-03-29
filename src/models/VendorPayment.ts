import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendorPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  appliedTo: {
    purchaseOrderId: mongoose.Types.ObjectId;
    amount: number;
  }[];
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorPaymentSchema = new Schema<IVendorPayment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    appliedTo: [
      {
        purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
        amount: { type: Number },
      },
    ],
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const VendorPayment: Model<IVendorPayment> =
  mongoose.models.VendorPayment ||
  mongoose.model<IVendorPayment>("VendorPayment", VendorPaymentSchema);
export default VendorPayment;
