import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { buildAllowedSettingsUpdate } from "@/lib/settings-route-payload";
import { writeAuditLog } from "@/lib/audit";

function sanitizeSettingsForClient(settings: unknown) {
  const source =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>)
      : {};

  return {
    ...source,
    emailApiKey: source.emailApiKey ? "********" : "",
    emailSmtpPassword: source.emailSmtpPassword ? "********" : "",
    siliconPayEncryptionKey: source.siliconPayEncryptionKey ? "********" : "",
    twilioApiSecret: source.twilioApiSecret ? "********" : "",
    pesapalConsumerSecret: source.pesapalConsumerSecret ? "********" : "",
    atApiKey: source.atApiKey ? "********" : "",
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const tenant = await Tenant.findById(auth.tenantId).lean();
    if (!tenant) return apiError("Tenant not found", 404);
    return apiSuccess({
      id: tenant._id,
      name: tenant.name,
      logo: tenant.logo || "",
      settings: sanitizeSettingsForClient(tenant.settings || {}),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const allowedFields = buildAllowedSettingsUpdate(body);

    if (Object.keys(allowedFields).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    const before = await Tenant.findById(auth.tenantId).lean();

    const tenant = await Tenant.findByIdAndUpdate(
      auth.tenantId,
      { $set: allowedFields },
      { new: true },
    ).lean();

    if (!tenant) return apiError("Tenant not found", 404);

    await writeAuditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: "update",
      tableAffected: "tenant_settings",
      recordId: String(auth.tenantId),
      oldValue: before
        ? {
            name: before.name,
            settings: before.settings,
          }
        : undefined,
      newValue: {
        name: tenant.name,
        settings: tenant.settings,
      },
      request,
    });

    return apiSuccess({
      id: tenant._id,
      name: tenant.name,
      logo: tenant.logo || "",
      settings: sanitizeSettingsForClient(tenant.settings || {}),
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}
