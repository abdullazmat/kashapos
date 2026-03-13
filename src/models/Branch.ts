import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBranch extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  locationType:
    | "warehouse"
    | "store_room"
    | "shelf_display"
    | "cold_storage"
    | "dispensary"
    | "other";
  assignedBranchId?: mongoose.Types.ObjectId;
  managerUserId?: mongoose.Types.ObjectId;
  address: string;
  phone: string;
  email: string;
  capacityUnits?: number;
  notes?: string;
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
    locationType: {
      type: String,
      enum: [
        "warehouse",
        "store_room",
        "shelf_display",
        "cold_storage",
        "dispensary",
        "other",
      ],
      default: "warehouse",
    },
    assignedBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    managerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    capacityUnits: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    isMain: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
export default Branch;
