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
    const { type, payload } = body;

    if (type === "silicon-pay") {
      // Test mobile money collection request
      const result = await SiliconPayService.collect({
        amount: payload.amount || 1000,
        phoneNumber: payload.phoneNumber || "256701234567",
        email: payload.email || "test@example.com",
        firstName: payload.firstName || "Customer",
        lastName: payload.lastName || "Test",
        txId: payload.txId || `TEST-${Date.now()}`,
        reason: payload.reason || "KashaPOS Test Collection",
        currency: payload.currency || "UGX",
      }, payload); // Pass payload for credentials
      return apiSuccess(result);
    }

    if (type === "twilio_sms") {
      const result = await twilioService.sendSMS(payload.phoneNumber || "+1234567890", payload.message || "Hello from KashaPOS! This is a test SMS.", payload);
      return apiSuccess(result);
    }

    if (type === "twilio_whatsapp") {
      const result = await twilioService.sendWhatsApp(payload.phoneNumber || "+1234567890", payload.message || "Hello from KashaPOS! This is a test WhatsApp message.", payload);
      return apiSuccess(result);
    }

    if (type === "at_sms") {
      const result = await africasTalkingService.sendSMS(payload.phoneNumber || "+256000000000", payload.message || "Hello from KashaPOS! This is a test SMS via Africa's Talking.", payload);
      return apiSuccess(result);
    }

    if (type === "at_balance") {
        try {
            const balance = await africasTalkingService.getBalance(payload);
            return apiSuccess({ success: true, balance, message: `Current Balance: ${balance}` });
        } catch (err: any) {
            return apiError(`Failed to fetch AT balance: ${err.message}`);
        }
    }

    if (type === "pesapal") {
      // Test Pesapal IPN registration or auth
      try {
        const result = await PesapalService.registerIpn(payload.callbackUrl || "https://example.com/callback", payload);
        return apiSuccess({ success: true, ipn_id: result, message: "Pesapal IPN Registration Successful" });
      } catch (err: any) {
        return apiError(`Pesapal Test Failed: ${err.message}`);
      }
    }

    if (type === "email_resend") {
      // Find a tenant for context or use a dummy
      const tenant = await Tenant.findOne();
      if (!tenant) return apiError("No tenant found for email test context", 404);

      const result = await sendTenantEmail({
        tenantId: tenant._id.toString(),
        to: payload.testEmail || payload.to || "test@example.com",
        subject: "KashaPOS Integration Test",
        html: "<p>Hello! This is a test email from your KashaPOS integration. If you see this, your Resend setup is working!</p>",
        settings: {
          emailProvider: "resend",
          emailApiKey: payload.emailApiKey || payload.apiKey, // Allow testing with provided key
          emailFromAddress: payload.emailFromAddress
        }
      });
      return apiSuccess(result);
    }

    if (type === "email_smtp") {
      const tenant = await Tenant.findOne();
      if (!tenant) return apiError("No tenant found for email test context", 404);

      const result = await sendTenantEmail({
        tenantId: tenant._id.toString(),
        to: payload.testEmail || payload.to || "test@example.com",
        subject: "KashaPOS SMTP Test",
        html: "<p>Hello! This is a test email from your KashaPOS SMTP integration. If you see this, your SMTP setup is working!</p>",
        settings: {
          emailProvider: "smtp",
          emailSmtpHost: payload.emailSmtpHost,
          emailSmtpPort: payload.emailSmtpPort,
          emailSmtpUser: payload.emailSmtpUser,
          emailSmtpPassword: payload.emailSmtpPassword,
          emailFromAddress: payload.emailFromAddress
        }
      });
      return apiSuccess(result);
    }

    return apiError("Invalid integration type", 400);
  } catch (error: any) {
    console.error("Integration Test Error:", error);
    return apiError(error.message || "Failed to test integration", 500);
  }
}
