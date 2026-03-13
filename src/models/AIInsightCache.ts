import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIInsightCache extends Document {
  tenantId: mongoose.Types.ObjectId;
  payload: Record<string, unknown>;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIInsightCacheSchema = new Schema<IAIInsightCache>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      unique: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

const AIInsightCache: Model<IAIInsightCache> =
  mongoose.models.AIInsightCache ||
  mongoose.model<IAIInsightCache>("AIInsightCache", AIInsightCacheSchema);

export default AIInsightCache;
