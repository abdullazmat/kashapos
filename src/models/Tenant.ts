import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  plan: "basic" | "professional" | "enterprise";
  planExpiry: Date;
  isActive: boolean;
  settings: {
    currency: string;
    taxRate: number;
    receiptHeader?: string;
    receiptFooter?: string;
    lowStockThreshold: number;
  };
  saasProduct: "retail" | "pharmacy" | "clinic";
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logo: { type: String },
    plan: {
      type: String,
      enum: ["basic", "professional", "enterprise"],
      default: "basic",
    },
    planExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    isActive: { type: Boolean, default: true },
    settings: {
      currency: { type: String, default: "UGX" },
      taxRate: { type: Number, default: 18 },
      receiptHeader: { type: String },
      receiptFooter: { type: String },
      lowStockThreshold: { type: Number, default: 10 },
    },
    saasProduct: {
      type: String,
      enum: ["retail", "pharmacy", "clinic"],
      default: "retail",
    },
  },
  { timestamps: true },
);

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
export default Tenant;
