import { encryptAtRest, isEncryptedAtRest } from "./crypto.ts";

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
  "outboundMessageGuardEnabled",
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
  "loyaltyProgramEnabled",
  "promotionsEnabled",
  "barcodeAutoGenerateOnProductCreate",
  "barcodeUseSkuAsDefaultValue",
  "barcodeAllowManualOverride",
  "barcodeShowPriceOnLabelsByDefault",
  "barcodeScanSound",
  "barcodeFailedScanAlert",
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
  "operatingHoursWeekdays",
  "operatingHoursWeekends",
  "operatingHoursNotes",
  "promotionMessage",
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
  "outboundMessageLimit",
  "outboundMessageWindowMinutes",
  "taxName",
  "taxNumber",
  "fiscalYearStart",
  "fiscalYearEnd",
  "currentFiscalYear",
  "currencyRateSource",
  "barcodeDefaultFormat",
  "barcodePrefix",
  "barcodeDefaultLabelSize",
  "barcodeDefaultPaperSize",
  "barcodeDefaultPrinterType",
  "barcodeDefaultFontSize",
  "siliconPayPublicKey",
  "siliconPayEncryptionKey",
  "twilioAccountSid",
  "twilioApiKey",
  "twilioApiSecret",
  "twilioWhatsAppNumber",
  "twilioSmsNumber",
  "pesapalConsumerKey",
  "pesapalConsumerSecret",
  "atUsername",
  "atApiKey",
] as const;

const numberFields = [
  "maxNegativeStockQty",
  "emailSmtpPort",
  "sessionTimeout",
  "itemsPerPage",
  "autoArchiveAfterDays",
  "currencyAutoRefreshMinutes",
  "aiCreditAlertThreshold",
  "loyaltyPointsRate",
  "outboundMessageLimit",
  "outboundMessageWindowMinutes",
  "barcodeDefaultHeightMm",
  "barcodeMarginTopMm",
  "barcodeMarginRightMm",
  "barcodeMarginBottomMm",
  "barcodeMarginLeftMm",
] as const;

export function buildAllowedSettingsUpdate(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const allowedFields: Record<string, unknown> = {};

  if (typeof body.businessName === "string") {
    allowedFields.name = body.businessName.trim();
  }
  if (typeof body.logo === "string") {
    allowedFields.logo = body.logo.trim();
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
      const trimmed = body[field].trim();

      // Secret-like settings are encrypted at rest before persistence.
      const sensitiveFields = [
        "emailApiKey",
        "emailSmtpPassword",
        "siliconPayEncryptionKey",
        "twilioApiSecret",
        "pesapalConsumerSecret",
        "atApiKey",
      ];

      if (sensitiveFields.includes(field)) {
        if (!trimmed || trimmed === "********") {
          continue;
        }

        allowedFields[`settings.${field}`] = isEncryptedAtRest(trimmed)
          ? trimmed
          : encryptAtRest(trimmed);
        continue;
      }

      allowedFields[`settings.${field}`] = trimmed;
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
        autoFetch: Boolean((row as Record<string, unknown>).autoFetch),
      }))
      .filter((row: { code: string; rate: number }) => {
        return (
          row.code.length === 3 && Number.isFinite(row.rate) && row.rate > 0
        );
      });
    allowedFields["settings.currencyRates"] = rates;
    allowedFields["settings.currencyLastSyncAt"] = now;
  }

  return allowedFields;
}
