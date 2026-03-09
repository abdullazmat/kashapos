import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBranch extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    isMain: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
export default Branch;
