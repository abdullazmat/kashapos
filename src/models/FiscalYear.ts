import mongoose, { Document, Model, Schema } from "mongoose";

export type FiscalYearCycle = "ura_jul_jun" | "calendar_jan_dec" | "custom";
export type FiscalYearStatus = "active" | "closed" | "archived";

export interface IFiscalYear extends Document {
  tenantId: mongoose.Types.ObjectId;
  label: string;
  startDate: Date;
  endDate: Date;
  cycle: FiscalYearCycle;
  status: FiscalYearStatus;
  archivedAt?: Date;
  lockedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FiscalYearSchema = new Schema<IFiscalYear>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    cycle: {
      type: String,
      enum: ["ura_jul_jun", "calendar_jan_dec", "custom"],
      default: "ura_jul_jun",
    },
    status: {
      type: String,
      enum: ["active", "closed", "archived"],
      default: "active",
      index: true,
    },
    archivedAt: { type: Date },
    lockedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

FiscalYearSchema.index({ tenantId: 1, label: 1 }, { unique: true });
FiscalYearSchema.index({ tenantId: 1, status: 1, startDate: -1 });

const FiscalYear: Model<IFiscalYear> =
  mongoose.models.FiscalYear ||
  mongoose.model<IFiscalYear>("FiscalYear", FiscalYearSchema);

export default FiscalYear;
