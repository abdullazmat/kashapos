import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendor extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  taxId?: string;
  notes: string;
  totalOrders: number;
  totalPaid: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
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
    contactPerson: { type: String, default: "" },
    taxId: { type: String },
    notes: { type: String, default: "" },
    totalOrders: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

VendorSchema.index({ tenantId: 1, name: "text" });

const Vendor: Model<IVendor> =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
export default Vendor;
