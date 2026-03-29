import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import OTP from "@/models/OTP";
import User from "@/models/User";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { sendSystemEmail } from "@/lib/mailer";
import { twilioService } from "@/lib/twilio";
import { africasTalkingService } from "@/lib/africastalking";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { identifier, method, purpose = "signup" } = await request.json();

    if (!identifier || !method) {
      return apiError("Identifier and method are required", 400);
    }

    // Check if the user already exists
    const query: Record<string, any> = {};
    if (method === "email") {
      query.email = identifier.toLowerCase();
    } else {
      query.phone = identifier.replace(/\s+/g, "");
    }
    
    const existingUser = await User.findOne(query);

    if (purpose === "signup") {
      if (existingUser) {
        return apiError(
          method === "email" ? "Email already registered" : "Phone number already registered",
          409
        );
      }
    } else if (purpose === "reset") {
      if (!existingUser) {
        return apiError(
          method === "email" ? "No account found with this email" : "No account found with this phone number",
          404
        );
      }
    }

    // Delete existing OTPs for this identifier
    await OTP.deleteMany({ identifier });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    await OTP.create({
      identifier,
      otp,
      // Expires in 15 minutes
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Send OTP
    let isMock = false;
    if (method === "email") {
      const res = await sendSystemEmail({
        to: identifier,
        subject: "Your Meka PoS Verification Code",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #f97316;">Meka PoS</h2>
            <p>Thank you for starting your sign up process.</p>
            <p>Your one-time verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; text-align: center; margin: 24px 0; color: #111;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 15 minutes.</p>
          </div>
        `,
      });
      if (res && 'mock' in res && res.mock) isMock = true;
    } else if (method === "phone") {
      await africasTalkingService.sendSMS(identifier, `Your Meka PoS verification code is: ${otp}`);
    } else if (method === "whatsapp") {
      await twilioService.sendWhatsApp(identifier, `Your Meka PoS verification code is: ${otp}`);
    } else {
      return apiError("Invalid method", 400);
    }

    return apiSuccess({ 
      message: "OTP sent successfully",
      mock: isMock,
      mockOtp: isMock ? otp : undefined 
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return apiError(error.message || "Internal server error", 500);
  }
}
