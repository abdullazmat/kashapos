import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUnit extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string; // e.g., "Piece", "Kg", "Box"
  shortName: string; // e.g., "pcs", "kg", "bx"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure unique unit name per tenant
UnitSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Unit: Model<IUnit> =
  mongoose.models.Unit || mongoose.model<IUnit>("Unit", UnitSchema);
export default Unit;
