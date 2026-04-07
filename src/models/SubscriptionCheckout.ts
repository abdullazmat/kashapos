import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscriptionCheckout extends Document {
  tenantId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planName: string;
  amount: number;
  baseMonthlyPrice?: number;
  billingCycle?: "monthly" | "annual" | "biennial";
  billingMonths?: number;
  discountRate?: number;
  savingsAmount?: number;
  currency: string;
  provider: "pesapal" | "silicon_pay";
  status: "initiated" | "completed" | "failed";
  reference: string;
  trackingId?: string;
  checkoutUrl?: string;
  paymentFlow?: "direct_prompt" | "hosted_web";
  customerEmail?: string;
  errorMessage?: string;
  raw?: Record<string, unknown>;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionCheckoutSchema = new Schema<ISubscriptionCheckout>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    baseMonthlyPrice: { type: Number },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual", "biennial"],
      default: "monthly",
    },
    billingMonths: { type: Number, default: 1 },
    discountRate: { type: Number, default: 0 },
    savingsAmount: { type: Number, default: 0 },
    currency: { type: String, default: "UGX" },
    provider: {
      type: String,
      enum: ["pesapal", "silicon_pay"],
      default: "silicon_pay",
    },
    status: {
      type: String,
      enum: ["initiated", "completed", "failed"],
      default: "initiated",
      index: true,
    },
    reference: { type: String, required: true, unique: true, index: true },
    trackingId: { type: String, index: true },
    checkoutUrl: { type: String },
    paymentFlow: {
      type: String,
      enum: ["direct_prompt", "hosted_web"],
      default: "direct_prompt",
    },
    customerEmail: { type: String },
    errorMessage: { type: String },
    raw: { type: Schema.Types.Mixed, default: undefined },
    activatedAt: { type: Date },
  },
  { timestamps: true },
);

const SubscriptionCheckout: Model<ISubscriptionCheckout> =
  mongoose.models.SubscriptionCheckout ||
  mongoose.model<ISubscriptionCheckout>(
    "SubscriptionCheckout",
    SubscriptionCheckoutSchema,
  );

export default SubscriptionCheckout;
