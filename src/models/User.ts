import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  branchId?: mongoose.Types.ObjectId;
  nationalId?: string;
  employmentType?: "full_time" | "part_time" | "contract";
  startDate?: Date;
  loginPin?: string;
  isActive: boolean;
  avatar?: string;
  lastLogin?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
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
    email: { type: String, required: false },
    phone: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      default: "cashier",
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    nationalId: { type: String },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract"],
    },
    startDate: { type: Date },
    loginPin: { type: String },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
    lastLogin: { type: Date },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
  },
  { timestamps: true },
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ tenantId: 1, phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
