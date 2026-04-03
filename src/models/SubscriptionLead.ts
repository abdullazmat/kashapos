import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscriptionLead extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId;
  planName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  message?: string;
  status: "new" | "contacted" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionLeadSchema = new Schema<ISubscriptionLead>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },
    planName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, index: true },
    contactPhone: { type: String, trim: true },
    companyName: { type: String, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

SubscriptionLeadSchema.index({ tenantId: 1, createdAt: -1 });

const SubscriptionLead: Model<ISubscriptionLead> =
  mongoose.models.SubscriptionLead ||
  mongoose.model<ISubscriptionLead>("SubscriptionLead", SubscriptionLeadSchema);

export default SubscriptionLead;
