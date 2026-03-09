import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "cashier";
  branchId?: mongoose.Types.ObjectId;
  isActive: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier"],
      default: "cashier",
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
