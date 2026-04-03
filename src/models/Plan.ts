import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlan extends Document {
  name: string;
  price: number | null; // null for 'Custom'
  currency: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  isPopular: boolean;
  isActive: boolean;
  order: number;
  maxBranches: number | null; // null for unlimited
  maxUsers: number | null; // null for unlimited
  maxProducts: number | null; // null for unlimited (future cap)
  maxCustomers: number | null; // null for unlimited (future cap)
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, unique: true },
    price: { type: Number, default: null }, // Null handles 'Custom'
    currency: { type: String, default: "UGX" },
    period: { type: String, default: "/per month" },
    description: { type: String, required: true },
    features: [{ type: String }],
    ctaText: { type: String, default: "Get Started" },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    maxBranches: { type: Number, default: null },
    maxUsers: { type: Number, default: null },
    maxProducts: { type: Number, default: null },
    maxCustomers: { type: Number, default: null },
  },
  { timestamps: true },
);

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
export default Plan;
