import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import OTP from "@/models/OTP";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { sendSystemEmail } from "@/lib/mailer";
import { twilioService } from "@/lib/twilio";
import { africasTalkingService } from "@/lib/africastalking";
import { checkOutboundMessageGuard } from "@/lib/outbound-message-guard";

const PROVIDER_TIMEOUT_MS = 8000;
const BALANCE_TIMEOUT_MS = 3000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { identifier: rawIdentifier, method, purpose = "signup" } = await request.json();
    const identifier = method === "email" 
      ? (rawIdentifier || "").trim().toLowerCase() 
      : (rawIdentifier || "").replace(/\s+/g, "");

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
    let tenantSettings:
      | {
          outboundMessageGuardEnabled?: boolean;
          outboundMessageLimit?: number;
          outboundMessageWindowMinutes?: number;
        }
      | undefined;

    if (existingUser?.tenantId) {
      const tenant = await Tenant.findById(existingUser.tenantId)
        .select(
          "settings.outboundMessageGuardEnabled settings.outboundMessageLimit settings.outboundMessageWindowMinutes",
        )
        .lean();
      tenantSettings = tenant?.settings;
    }

    if (purpose === "signup") {
      if (existingUser) {
        return apiError(
          method === "email"
            ? "Email already registered"
            : "Phone number already registered",
          409,
        );
      }
    } else if (purpose === "reset") {
      if (!existingUser) {
        return apiError(
          method === "email"
            ? "No account found with this email"
            : "No account found with this phone number",
          404,
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
      // Expires in 30 minutes
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    // Send OTP
    let isMock = false;
    let deliveryMethodUsed = method;
    let deliveryWarning: string | undefined;
    if (method === "email") {
      const res = await sendSystemEmail({
        to: identifier,
        subject: "Your KashaPOS Verification Code",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #f97316;">KashaPOS</h2>
            <p>Thank you for starting your sign up process.</p>
            <p>Your one-time verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; text-align: center; margin: 24px 0; color: #111;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 30 minutes.</p>
          </div>
        `,
      });
      if (res && "mock" in res && res.mock) isMock = true;
    } else if (method === "phone") {
      try {
        const guard = checkOutboundMessageGuard({
          tenantId: existingUser?.tenantId?.toString() || "system",
          channel: "otp-sms",
          recipient: identifier,
          settings: tenantSettings,
        });

        if (!guard.allowed) {
          return apiError(
            `Message sending is temporarily limited. Try again in ${guard.retryAfterSeconds}s`,
            429,
          );
        }

        // Check balance before sending
        try {
          const balance = await withTimeout(
            africasTalkingService.getBalance(),
            BALANCE_TIMEOUT_MS,
            "Africa's Talking balance check",
          );
          if (balance && parseFloat(balance) <= 0) {
            console.warn(
              "Africa's Talking balance insufficient:",
              balance,
              "- falling back to email",
            );
            throw new Error("Insufficient Africa's Talking balance");
          }
        } catch (balanceError: any) {
          console.warn(
            "Could not verify Africa's Talking balance:",
            balanceError.message,
          );
          // Continue anyway, let the send fail if needed
        }

        const result = await withTimeout(
          africasTalkingService.sendSMS(
            identifier,
            `Your KashaPOS verification code is: ${otp}`,
          ),
          PROVIDER_TIMEOUT_MS,
          "Africa's Talking SMS",
        );
        if (!result.success) {
          throw new Error(result.message || "SMS delivery failed");
        }
      } catch (phoneError: any) {
        console.error(
          "Phone SMS delivery via Africa's Talking failed, trying Twilio fallback:",
          phoneError,
        );

        // Try Twilio SMS fallback before moving to email.
        try {
          const twilioFallback = await withTimeout(
            twilioService.sendSMS(
              identifier,
              `Your KashaPOS verification code is: ${otp}`,
            ),
            PROVIDER_TIMEOUT_MS,
            "Twilio SMS fallback",
          );
          if (twilioFallback.success) {
            deliveryMethodUsed = "phone";
            deliveryWarning =
              "Africa's Talking delivery failed; OTP sent via Twilio SMS fallback.";
            return apiSuccess({
              message: "OTP sent successfully",
              deliveryMethodUsed,
              warning: deliveryWarning,
              mock: isMock,
              mockOtp: isMock ? otp : undefined,
            });
          }
        } catch (twilioError: any) {
          console.error(
            "Twilio SMS fallback failed, falling back to email:",
            twilioError,
          );
        }

        // Try to find user by phone to get their email for fallback
        let emailForFallback: string | undefined;
        try {
          const user = await User.findOne({
            phone: identifier.replace(/\s+/g, ""),
          });
          emailForFallback = user?.email;
        } catch (userLookupError: any) {
          console.warn(
            "Could not lookup user email for SMS fallback:",
            userLookupError.message,
          );
        }

        // Only attempt email fallback if we found an email
        if (emailForFallback) {
          const fallbackResult = await withTimeout(
            sendSystemEmail({
              to: emailForFallback,
              subject: "Your KashaPOS Verification Code",
              html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #f97316;">KashaPOS</h2>
                <p>Thank you for starting your sign up process.</p>
                <p>Your one-time verification code is:</p>
                <div style="background-color: #f3f4f6; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; text-align: center; margin: 24px 0; color: #111;">
                  ${otp}
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in 30 minutes.</p>
              </div>
            `,
            }),
            PROVIDER_TIMEOUT_MS,
            "Email fallback",
          );
          if (fallbackResult && "mock" in fallbackResult && fallbackResult.mock)
            isMock = true;
          deliveryMethodUsed = "email";
          deliveryWarning = "SMS delivery failed; OTP sent via email fallback.";
        } else {
          // No email found - can't deliver OTP
          const errorMsg = "SMS delivery failed and no email on file for fallback";
          console.error(errorMsg);
          return apiError(errorMsg, 503);
        }
      }
    } else if (method === "whatsapp") {
      try {
        const guard = checkOutboundMessageGuard({
          tenantId: existingUser?.tenantId?.toString() || "system",
          channel: "otp-whatsapp",
          recipient: identifier,
          settings: tenantSettings,
        });

        if (!guard.allowed) {
          return apiError(
            `Message sending is temporarily limited. Try again in ${guard.retryAfterSeconds}s`,
            429,
          );
        }

        const result = await withTimeout(
          twilioService.sendWhatsApp(
            identifier,
            `Your KashaPOS verification code is: ${otp}`,
          ),
          PROVIDER_TIMEOUT_MS,
          "Twilio WhatsApp",
        );
        if (!result.success) throw new Error(result.message || "WhatsApp delivery failed");
      } catch (whatsAppError: any) {
        console.error(
          "WhatsApp OTP delivery failed, falling back to SMS:",
          whatsAppError,
        );
        try {
          const fallbackResult = await withTimeout(
            africasTalkingService.sendSMS(
              identifier,
              `Your KashaPOS verification code is: ${otp}`,
            ),
            PROVIDER_TIMEOUT_MS,
            "SMS fallback",
          );
          if (!fallbackResult.success) {
            throw new Error(
              fallbackResult.message || "SMS fallback delivery failed",
            );
          }
          deliveryMethodUsed = "phone";
          deliveryWarning =
            "WhatsApp delivery failed; OTP sent via SMS fallback.";
        } catch (smsError: any) {
          console.error(
            "SMS fallback also failed, falling back to email:",
            smsError,
          );

          // Try to find user by phone to get their email for fallback
          let emailForFallback: string | undefined;
          try {
            const user = await User.findOne({
              phone: identifier.replace(/\s+/g, ""),
            });
            emailForFallback = user?.email;
          } catch (userLookupError: any) {
            console.warn(
              "Could not lookup user email for SMS fallback:",
              userLookupError.message,
            );
          }

          if (emailForFallback) {
            const emailFallback = await withTimeout(
              sendSystemEmail({
                to: emailForFallback,
                subject: "Your KashaPOS Verification Code",
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #f97316;">KashaPOS</h2>
                  <p>Thank you for starting your sign up process.</p>
                  <p>Your one-time verification code is:</p>
                  <div style="background-color: #f3f4f6; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; text-align: center; margin: 24px 0; color: #111;">
                    ${otp}
                  </div>
                  <p style="font-size: 14px; color: #666;">This code will expire in 30 minutes.</p>
                </div>
              `,
              }),
              PROVIDER_TIMEOUT_MS,
              "Email fallback",
            );
            if (emailFallback && "mock" in emailFallback && emailFallback.mock)
              isMock = true;
            deliveryMethodUsed = "email";
            deliveryWarning =
              "WhatsApp and SMS delivery failed; OTP sent via email fallback.";
          } else {
            const errorMsg = "WhatsApp and SMS delivery failed and no email on file for fallback";
            console.error(errorMsg);
            return apiError(errorMsg, 503);
          }
        }
      }
    } else {
      return apiError("Invalid method", 400);
    }

    return apiSuccess({
      message: "OTP sent successfully",
      deliveryMethodUsed,
      warning: deliveryWarning,
      mock: isMock,
      mockOtp: isMock ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return apiError(error.message || "Internal server error", 500);
  }
}
