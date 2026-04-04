import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import Plan from "@/models/Plan";
import Tenant from "@/models/Tenant";
import GlobalConfig from "@/models/GlobalConfig";
import SubscriptionLead from "@/models/SubscriptionLead";
import { sendSystemEmail, sendTenantEmail } from "@/lib/mailer";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resolveSupportRecipients() {
  const fromEnv = [
    process.env.SALES_CONTACT_EMAIL?.trim(),
    process.env.SUPPORT_EMAIL?.trim(),
  ].filter(Boolean) as string[];

  const config = await GlobalConfig.findOne().select("supportEmail").lean();
  const fromConfig = String(config?.supportEmail || "").trim();

  const recipients = Array.from(
    new Set(
      [...fromEnv, fromConfig]
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value && isValidEmail(value)),
    ),
  );

  return recipients;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
    }
    if (session.role !== "admin" && session.role !== "super_admin") {
      return apiError(
        "Only admin users can submit contact sales requests",
        403,
      );
    }

    await dbConnect();

    const {
      planId,
      planName,
      contactName,
      contactEmail,
      contactPhone,
      companyName,
      message,
    } = await request.json();

    const safeName = String(contactName || "").trim();
    const safeEmail = String(contactEmail || "")
      .trim()
      .toLowerCase();
    const safePlanName = String(planName || "").trim();
    const safeMessage = String(message || "").trim();
    const safePhone = String(contactPhone || "").trim();
    const safeCompanyName = String(companyName || "").trim();

    if (!safeName) {
      return apiError("Contact name is required", 400);
    }
    if (!isValidEmail(safeEmail)) {
      return apiError("Valid contact email is required", 400);
    }
    if (safeMessage.length > 2000) {
      return apiError("Message is too long (max 2000 characters)", 400);
    }

    let resolvedPlanName = safePlanName;
    let resolvedPlanId: mongoose.Types.ObjectId | undefined;

    if (planId) {
      if (!mongoose.Types.ObjectId.isValid(String(planId))) {
        return apiError("Invalid plan id", 400);
      }
      const plan = await Plan.findById(planId).lean();
      if (!plan) {
        return apiError("Plan not found", 404);
      }
      resolvedPlanId = plan._id as mongoose.Types.ObjectId;
      resolvedPlanName = plan.name;
    }

    if (!resolvedPlanName) {
      return apiError("Plan name is required", 400);
    }

    const tenant = await Tenant.findById(session.tenantId)
      .select("name email")
      .lean();

    const lead = await SubscriptionLead.create({
      tenantId: session.tenantId,
      userId: session.userId,
      planId: resolvedPlanId,
      planName: resolvedPlanName,
      contactName: safeName,
      contactEmail: safeEmail,
      contactPhone: safePhone || undefined,
      companyName: safeCompanyName || tenant?.name || undefined,
      message: safeMessage || undefined,
    });

    const supportRecipients = await resolveSupportRecipients();
    if (supportRecipients.length === 0) {
      return apiError(
        "Support email is not configured. Set SUPPORT_EMAIL (or SALES_CONTACT_EMAIL) in environment, or set support email in admin settings.",
        500,
      );
    }

    const supportMailHtml = `<div style="font-family:Arial,sans-serif;line-height:1.5"><h3>Custom Plan Request</h3><p><strong>Plan:</strong> ${escapeHtml(resolvedPlanName)}</p><p><strong>Tenant:</strong> ${escapeHtml(String(tenant?.name || "Unknown"))}</p><p><strong>Contact:</strong> ${escapeHtml(safeName)}</p><p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p><p><strong>Phone:</strong> ${escapeHtml(safePhone || "-")}</p><p><strong>Company:</strong> ${escapeHtml(safeCompanyName || tenant?.name || "-")}</p><p><strong>Message:</strong> ${escapeHtml(safeMessage || "-")}</p><p><strong>Lead ID:</strong> ${escapeHtml(String(lead._id))}</p></div>`;

    const supportSendResults = await Promise.allSettled(
      supportRecipients.map((recipient) =>
        sendSystemEmail({
          to: recipient,
          subject: `New custom plan request: ${resolvedPlanName}`,
          html: supportMailHtml,
        }),
      ),
    );

    const successfulSupportSends = supportSendResults.filter(
      (result) => result.status === "fulfilled",
    ).length;

    if (successfulSupportSends === 0) {
      return apiError(
        "Request saved but support notification email failed. Please retry in a moment or contact support directly.",
        502,
      );
    }

    try {
      await sendTenantEmail({
        tenantId: session.tenantId,
        to: safeEmail,
        subject: `Custom plan request received: ${resolvedPlanName}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Thanks, we got your request</h2><p>We received your custom plan request for <strong>${escapeHtml(resolvedPlanName)}</strong>.</p><p>Our sales team will contact you soon.</p><p>Reference: <strong>${escapeHtml(String(lead._id))}</strong></p></div>`,
      });
    } catch {
      // Keep API successful if customer confirmation email fails.
    }

    return apiSuccess(
      {
        leadId: String(lead._id),
        supportNotified: true,
        message:
          "Contact request sent successfully. Our sales team has been notified and will reach out shortly.",
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(message, 500);
  }
}
