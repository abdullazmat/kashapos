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
  "emailReceiptAutoSend",
  "emailInvoiceAutoSend",
  "emailBalanceReminderEnabled",
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
  "aiNotificationsEnabled",
  "aiAssistantEnabled",
  "aiSmartInsightsEnabled",
  "aiDailySummaryEmailEnabled",
  "aiWeeklyReviewEmailEnabled",
  "aiLowStockNotificationEnabled",
  "aiCreditAlertNotificationEnabled",
  "aiDataUsageAccepted",
] as const;

const stringFields = [
  "businessType",
  "tinTaxId",
  "vatRegistrationNo",
  "physicalAddress",
  "district",
  "country",
  "phoneNumber",
  "emailAddress",
  "dateFormat",
  "timeFormat",
  "language",
  "aiLanguage",
  "aiTone",
  "aiDailySummaryEmailTime",
  "aiWeeklyReviewEmailDay",
  "aiModelPreference",
  "aiDataPreference",
  "discountType",
  "passwordRequirement",
  "theme",
  "defaultReportPeriod",
  "defaultUserRole",
  "emailProvider",
  "emailApiKey",
  "emailSmtpHost",
  "emailSmtpUser",
  "emailSmtpPassword",
  "emailFromName",
  "emailFromAddress",
  "emailReplyToAddress",
  "emailBalanceReminderFrequency",
  "taxName",
  "taxNumber",
  "fiscalYearStart",
  "fiscalYearEnd",
  "currentFiscalYear",
  "currencyRateSource",
] as const;

const numberFields = [
  "maxNegativeStockQty",
  "emailSmtpPort",
  "sessionTimeout",
  "itemsPerPage",
  "autoArchiveAfterDays",
  "currencyAutoRefreshMinutes",
  "aiCreditAlertThreshold",
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

    if (
      typeof body.rolePermissions === "object" &&
      body.rolePermissions !== null &&
      !Array.isArray(body.rolePermissions)
    ) {
      const cleaned: Record<string, string[]> = {};
      for (const [roleKey, permissions] of Object.entries(
        body.rolePermissions as Record<string, unknown>,
      )) {
        if (!roleKey.trim()) continue;
        if (!Array.isArray(permissions)) continue;
        cleaned[roleKey] = permissions
          .map((p) => String(p).trim())
          .filter(Boolean);
      }
      allowedFields["settings.rolePermissions"] = cleaned;
    }

    if (Array.isArray(body.customRoles)) {
      const customRoles = body.customRoles
        .map((role: unknown) => ({
          key: String((role as Record<string, unknown>).key || "")
            .trim()
            .toLowerCase(),
          name: String((role as Record<string, unknown>).name || "").trim(),
          permissions: Array.isArray(
            (role as Record<string, unknown>).permissions,
          )
            ? ((role as Record<string, unknown>).permissions as unknown[])
                .map((p) => String(p).trim())
                .filter(Boolean)
            : [],
          isActive:
            (role as Record<string, unknown>).isActive === undefined
              ? true
              : Boolean((role as Record<string, unknown>).isActive),
        }))
        .filter((role: { key: string; name: string }) => role.key && role.name);

      allowedFields["settings.customRoles"] = customRoles;
    }

    if (Array.isArray(body.currencyRates)) {
      const now = new Date();
      const rates = body.currencyRates
        .map((row: unknown) => ({
          code: String((row as Record<string, unknown>).code || "")
            .trim()
            .toUpperCase(),
          rate: Number((row as Record<string, unknown>).rate || 0),
          lastUpdatedAt: (row as Record<string, unknown>).lastUpdatedAt
            ? new Date(
                String((row as Record<string, unknown>).lastUpdatedAt || now),
              )
            : now,
        }))
        .filter((row: { code: string; rate: number }) => {
          return (
            row.code.length === 3 && Number.isFinite(row.rate) && row.rate > 0
          );
        });
      allowedFields["settings.currencyRates"] = rates;
      allowedFields["settings.currencyLastSyncAt"] = now;
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
