import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOfflineSyncOperation extends Document {
  tenantId: mongoose.Types.ObjectId;
  operationKey: string;
  operationType: string;
  clientTimestamp: Date;
  status: "applied" | "rejected";
  result: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OfflineSyncOperationSchema = new Schema<IOfflineSyncOperation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    operationKey: { type: String, required: true },
    operationType: { type: String, required: true },
    clientTimestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: ["applied", "rejected"],
      required: true,
    },
    result: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

OfflineSyncOperationSchema.index(
  { tenantId: 1, operationKey: 1 },
  { unique: true },
);

const OfflineSyncOperation: Model<IOfflineSyncOperation> =
  mongoose.models.OfflineSyncOperation ||
  mongoose.model<IOfflineSyncOperation>(
    "OfflineSyncOperation",
    OfflineSyncOperationSchema,
  );

export default OfflineSyncOperation;
