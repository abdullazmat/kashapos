import { NextRequest, NextResponse } from "next/server";
import { SiliconPayService } from "@/lib/silicon-pay";
import { twilioService } from "@/lib/twilio";
import { africasTalkingService } from "@/lib/africastalking";
import { PesapalService } from "@/lib/pesapal";
import { sendTenantEmail } from "@/lib/mailer";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";
import Tenant from "@/models/Tenant";

/**
 * Route to test various integrations (Silicon Pay, Twilio SMS/WhatsApp)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const body = await req.json();
    const { type, payload = {} } = body;
    const phoneNumber = String(payload?.phoneNumber || "").trim();
    const testEmail = String(payload?.testEmail || payload?.to || "").trim();

    if (type === "silicon-pay") {
      if (!phoneNumber) {
        return apiError("phoneNumber is required for silicon-pay test", 400);
      }
      if (!payload.email) {
        return apiError("email is required for silicon-pay test", 400);
      }
      // Test mobile money collection request
      const result = await SiliconPayService.collect(
        {
          amount: payload.amount || 1000,
          phoneNumber,
          email: payload.email,
          firstName: payload.firstName || "Customer",
          lastName: payload.lastName || "Test",
          txId: payload.txId || `TEST-${Date.now()}`,
          reason: payload.reason || "KashaPOS Test Collection",
          currency: payload.currency || "UGX",
        },
        payload,
      ); // Pass payload for credentials
      return apiSuccess(result);
    }

    if (type === "twilio_sms") {
      if (!phoneNumber) {
        return apiError("phoneNumber is required for twilio_sms test", 400);
      }
      const result = await twilioService.sendSMS(
        phoneNumber,
        payload.message || "Hello from KashaPOS! This is a test SMS.",
        payload,
      );
      return apiSuccess(result);
    }

    if (type === "twilio_whatsapp") {
      if (!phoneNumber) {
        return apiError(
          "phoneNumber is required for twilio_whatsapp test",
          400,
        );
      }
      const result = await twilioService.sendWhatsApp(
        phoneNumber,
        payload.message ||
          "Hello from KashaPOS! This is a test WhatsApp message.",
        payload,
      );
      return apiSuccess(result);
    }

    if (type === "at_sms") {
      if (!phoneNumber) {
        return apiError("phoneNumber is required for at_sms test", 400);
      }
      const result = await africasTalkingService.sendSMS(
        phoneNumber,
        payload.message ||
          "Hello from KashaPOS! This is a test SMS via Africa's Talking.",
        payload,
      );
      return apiSuccess(result);
    }

    if (type === "at_balance") {
      try {
        const balance = await africasTalkingService.getBalance(payload);
        return apiSuccess({
          success: true,
          balance,
          message: `Current Balance: ${balance}`,
        });
      } catch (err: any) {
        return apiError(`Failed to fetch AT balance: ${err.message}`);
      }
    }

    if (type === "pesapal") {
      // Test Pesapal IPN registration or auth
      try {
        const result = await PesapalService.registerIpn(
          payload.callbackUrl || "https://example.com/callback",
          payload,
        );
        return apiSuccess({
          success: true,
          ipn_id: result,
          message: "Pesapal IPN Registration Successful",
        });
      } catch (err: any) {
        return apiError(`Pesapal Test Failed: ${err.message}`);
      }
    }

    if (type === "email_resend") {
      // Find a tenant for context or use a dummy
      const tenant = await Tenant.findOne();
      if (!tenant)
        return apiError("No tenant found for email test context", 404);
      if (!testEmail)
        return apiError("testEmail is required for email_resend test", 400);

      const result = await sendTenantEmail({
        tenantId: tenant._id.toString(),
        to: testEmail,
        subject: "KashaPOS Integration Test",
        html: "<p>Hello! This is a test email from your KashaPOS integration. If you see this, your Resend setup is working!</p>",
        settings: {
          emailProvider: "resend",
          emailApiKey: payload.emailApiKey || payload.apiKey, // Allow testing with provided key
          emailFromAddress: payload.emailFromAddress,
        },
      });
      return apiSuccess(result);
    }

    if (type === "email_smtp") {
      const tenant = await Tenant.findOne();
      if (!tenant)
        return apiError("No tenant found for email test context", 404);
      if (!testEmail)
        return apiError("testEmail is required for email_smtp test", 400);

      const result = await sendTenantEmail({
        tenantId: tenant._id.toString(),
        to: testEmail,
        subject: "KashaPOS SMTP Test",
        html: "<p>Hello! This is a test email from your KashaPOS SMTP integration. If you see this, your SMTP setup is working!</p>",
        settings: {
          emailProvider: "smtp",
          emailSmtpHost: payload.emailSmtpHost,
          emailSmtpPort: payload.emailSmtpPort,
          emailSmtpUser: payload.emailSmtpUser,
          emailSmtpPassword: payload.emailSmtpPassword,
          emailFromAddress: payload.emailFromAddress,
        },
      });
      return apiSuccess(result);
    }

    return apiError("Invalid integration type", 400);
  } catch (error: any) {
    console.error("Integration Test Error:", error);
    return apiError(error.message || "Failed to test integration", 500);
  }
}
