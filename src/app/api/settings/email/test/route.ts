import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") {
      return apiError("Insufficient permissions", 403);
    }

    const body = (await request.json()) as { email?: string; settings?: any };
    const testEmail = String(body.email || "").trim();
    if (!testEmail) {
      return apiError("Test email address is required", 400);
    }

    const tenant = await Tenant.findById(auth.tenantId).lean();
    if (!tenant) return apiError("Tenant not found", 404);

    await sendTenantEmail({
      tenantId: auth.tenantId,
      to: testEmail,
      settings: body.settings,
      subject: "MEKA POS Email Configuration Test",
      text: `Hello, this is a test email from ${tenant.name}. Your email settings are working.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Email Test Successful</h2><p>Hello, this is a test email from <strong>${tenant.name}</strong>.</p><p>Your email configuration is working correctly.</p></div>`,
    });

    return apiSuccess({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Settings email test POST error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to send test email",
      500,
    );
  }
}
