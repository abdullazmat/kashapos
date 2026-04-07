import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import OTP from "@/models/OTP";
import User from "@/models/User";
import { hashPassword, normalizeIdentifier } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { validatePasswordPolicy } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { identifier, otp, newPassword } = await request.json();

    if (!identifier || !otp || !newPassword) {
      return apiError("Missing required fields", 400);
    }

    const trimmedPassword = newPassword.trim();
    const policyError = validatePasswordPolicy(trimmedPassword);
    if (policyError) {
      return apiError(policyError, 400);
    }

    const normalizedIdentifier = normalizeIdentifier(identifier);
    const validOtp = await OTP.findOne({ 
      identifier: normalizedIdentifier, 
      otp,
      expiresAt: { $gt: new Date() }
    });
    if (!validOtp) {
      return apiError("Invalid or expired verification code", 400);
    }

    const query = identifier.includes("@")
      ? { email: normalizedIdentifier }
      : { phone: normalizedIdentifier };

    const user = await User.findOne(query);
    if (!user) {
      return apiError("Account not found", 404);
    }

    // Hash the new password and reset lockout markers
    user.password = await hashPassword(trimmedPassword);
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    
    await user.save();
    
    // Clean up used OTP
    await OTP.deleteOne({ _id: validOtp._id });

    return apiSuccess({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return apiError("Internal server error", 500);
  }
}
