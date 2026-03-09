import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotificationRead extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  notificationId: string;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationReadSchema = new Schema<INotificationRead>(
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
    notificationId: { type: String, required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

NotificationReadSchema.index(
  { tenantId: 1, userId: 1, notificationId: 1 },
  { unique: true },
);

const NotificationRead: Model<INotificationRead> =
  mongoose.models.NotificationRead ||
  mongoose.model<INotificationRead>("NotificationRead", NotificationReadSchema);

export default NotificationRead;
