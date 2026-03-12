import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: "login" | "create" | "update" | "delete" | "view";
  module:
    | "auth"
    | "items"
    | "sales"
    | "purchases"
    | "customers"
    | "vendors"
    | "stock"
    | "expenses"
    | "invoices"
    | "settings";
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: {
      type: String,
      enum: ["login", "create", "update", "delete", "view"],
      required: true,
    },
    module: {
      type: String,
      enum: [
        "auth",
        "items",
        "sales",
        "purchases",
        "customers",
        "vendors",
        "stock",
        "expenses",
        "invoices",
        "settings",
      ],
      required: true,
    },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, action: 1 });
ActivityLogSchema.index({ tenantId: 1, module: 1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
export default ActivityLog;
