import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

const booleanFields = [
  "enableSaleLevelDiscount",
  "enableItemLevelDiscount",
  "requireDiscountApproval",
  "blockSalesOnCreditLimit",
  "enableAutoPriceMemory",
  "hideFinancials",
  "enableBarcodeScanning",
  "allowNegativeStock",
  "autoReorderOnNegative",
  "notifyOnNegativeStock",
  "emailNotifications",
  "stockLevelAlerts",
  "reorderAlerts",
  "pushNotifications",
  "systemUpdates",
  "weeklyReports",
  "twoFactorAuth",
  "auditLog",
  "showPreviewImages",
  "sidebarDefaultCollapsed",
  "enableAnimations",
  "autoGenerateReports",
  "allowEmailVerify",
  "allowSelfRegistration",
  "enableTaxes",
  "allowItemLevelTax",
  "archiveEnabled",
  "legacyMode",
] as const;

const stringFields = [
  "dateFormat",
  "timeFormat",
  "language",
  "discountType",
  "passwordRequirement",
  "theme",
  "defaultReportPeriod",
  "defaultUserRole",
  "taxName",
  "taxNumber",
  "fiscalYearStart",
  "fiscalYearEnd",
  "currentFiscalYear",
] as const;

const numberFields = [
  "maxNegativeStockQty",
  "sessionTimeout",
  "itemsPerPage",
  "autoArchiveAfterDays",
] as const;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const tenant = await Tenant.findById(auth.tenantId).lean();
    if (!tenant) return apiError("Tenant not found", 404);
    return apiSuccess({
      id: tenant._id,
      name: tenant.name,
      settings: tenant.settings,
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

    for (const field of booleanFields) {
      if (typeof body[field] === "boolean") {
        allowedFields[`settings.${field}`] = body[field];
      }
    }
    for (const field of stringFields) {
      if (typeof body[field] === "string") {
        allowedFields[`settings.${field}`] = body[field].trim();
      }
    }
    for (const field of numberFields) {
      if (typeof body[field] === "number") {
        allowedFields[`settings.${field}`] = Math.max(0, body[field]);
      }
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
