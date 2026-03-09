import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const allowedFields: Record<string, unknown> = {};

    if (typeof body.businessName === "string") {
      allowedFields.name = body.businessName.trim();
    }
    if (typeof body.currency === "string") {
      allowedFields["settings.currency"] = body.currency;
    }
    if (typeof body.taxRate === "number") {
      allowedFields["settings.taxRate"] = Math.max(
        0,
        Math.min(100, body.taxRate),
      );
    }
    if (typeof body.receiptHeader === "string") {
      allowedFields["settings.receiptHeader"] = body.receiptHeader;
    }
    if (typeof body.receiptFooter === "string") {
      allowedFields["settings.receiptFooter"] = body.receiptFooter;
    }
    if (typeof body.lowStockThreshold === "number") {
      allowedFields["settings.lowStockThreshold"] = Math.max(
        0,
        body.lowStockThreshold,
      );
    }

    if (Object.keys(allowedFields).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    const tenant = await Tenant.findByIdAndUpdate(
      auth.tenantId,
      { $set: allowedFields },
      { new: true },
    ).lean();

    if (!tenant) return apiError("Tenant not found", 404);

    return apiSuccess({
      id: tenant._id,
      name: tenant.name,
      settings: tenant.settings,
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}
