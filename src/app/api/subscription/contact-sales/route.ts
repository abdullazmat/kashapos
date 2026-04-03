import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import Plan from "@/models/Plan";
import Tenant from "@/models/Tenant";
import SubscriptionLead from "@/models/SubscriptionLead";
import { sendSystemEmail, sendTenantEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
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

    if (!safeName) {
      return apiError("Contact name is required", 400);
    }
    if (!safeEmail || !safeEmail.includes("@")) {
      return apiError("Valid contact email is required", 400);
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
      contactPhone: String(contactPhone || "").trim() || undefined,
      companyName:
        String(companyName || "").trim() || tenant?.name || undefined,
      message: safeMessage || undefined,
    });

    const salesInbox = process.env.SALES_CONTACT_EMAIL?.trim();
    if (salesInbox) {
      try {
        await sendSystemEmail({
          to: salesInbox,
          subject: `New custom plan request: ${resolvedPlanName}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h3>Custom Plan Request</h3><p><strong>Plan:</strong> ${resolvedPlanName}</p><p><strong>Tenant:</strong> ${tenant?.name || "Unknown"}</p><p><strong>Contact:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Phone:</strong> ${String(contactPhone || "-")}</p><p><strong>Message:</strong> ${safeMessage || "-"}</p><p><strong>Lead ID:</strong> ${String(lead._id)}</p></div>`,
        });
      } catch {
        // Lead is still persisted even if notification email fails.
      }
    }

    try {
      await sendTenantEmail({
        tenantId: session.tenantId,
        to: safeEmail,
        subject: `Custom plan request received: ${resolvedPlanName}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Thanks, we got your request</h2><p>We received your custom plan request for <strong>${resolvedPlanName}</strong>.</p><p>Our sales team will contact you soon.</p><p>Reference: <strong>${String(lead._id)}</strong></p></div>`,
      });
    } catch {
      // Keep API successful even if confirmation email fails.
    }

    return apiSuccess(
      {
        leadId: String(lead._id),
        message: "Contact request sent. Sales team will reach out shortly.",
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(message, 500);
  }
}
