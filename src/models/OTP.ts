import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  identifier: string; // email or phone number
  otp: string;
  expiresAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    identifier: {
      type: String,
      required: true,
      index: true, // For fast lookups
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // Automatically delete when this date is reached
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);
