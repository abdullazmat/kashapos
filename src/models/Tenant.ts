import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenantSettings {
  currency: string;
  taxRate: number;
  receiptHeader?: string;
  receiptFooter?: string;
  lowStockThreshold: number;
  // Store Profile
  businessType?: string;
  tinTaxId?: string;
  vatRegistrationNo?: string;
  physicalAddress?: string;
  district?: string;
  country?: string;
  phoneNumber?: string;
  emailAddress?: string;
  // General
  dateFormat?: string;
  timeFormat?: string;
  language?: string;
  // Discount
  enableSaleLevelDiscount?: boolean;
  enableItemLevelDiscount?: boolean;
  discountType?: string;
  requireDiscountApproval?: boolean;
  // Financial
  blockSalesOnCreditLimit?: boolean;
  enableAutoPriceMemory?: boolean;
  hideFinancials?: boolean;
  // Inventory
  enableBarcodeScanning?: boolean;
  allowNegativeStock?: boolean;
  maxNegativeStockQty?: number;
  autoReorderOnNegative?: boolean;
  notifyOnNegativeStock?: boolean;
  // Notifications
  emailNotifications?: boolean;
  emailProvider?: "sendgrid" | "mailgun" | "smtp" | "postmark";
  emailApiKey?: string;
  emailSmtpHost?: string;
  emailSmtpPort?: number;
  emailSmtpUser?: string;
  emailSmtpPassword?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  emailReplyToAddress?: string;
  emailReceiptAutoSend?: boolean;
  emailInvoiceAutoSend?: boolean;
  emailBalanceReminderEnabled?: boolean;
  emailBalanceReminderFrequency?: "daily" | "weekly" | "overdue";
  stockLevelAlerts?: boolean;
  reorderAlerts?: boolean;
  pushNotifications?: boolean;
  systemUpdates?: boolean;
  weeklyReports?: boolean;
  // Security
  twoFactorAuth?: boolean;
  auditLog?: boolean;
  sessionTimeout?: number;
  passwordRequirement?: string;
  // Display
  theme?: string;
  itemsPerPage?: number;
  showPreviewImages?: boolean;
  sidebarDefaultCollapsed?: boolean;
  enableAnimations?: boolean;
  // Reports
  defaultReportPeriod?: string;
  autoGenerateReports?: boolean;
  // Users
  defaultUserRole?: string;
  allowEmailVerify?: boolean;
  allowSelfRegistration?: boolean;
  // Tax
  enableTaxes?: boolean;
  allowItemLevelTax?: boolean;
  taxName?: string;
  taxNumber?: string;
  // Fiscal Year
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  currentFiscalYear?: string;
  // Archive
  autoArchiveAfterDays?: number;
  archiveEnabled?: boolean;
  // Legacy
  legacyMode?: boolean;
  rolePermissions?: Record<string, string[]>;
  customRoles?: {
    key: string;
    name: string;
    permissions: string[];
    isActive: boolean;
  }[];
  currencyRateSource?: "manual" | "api";
  currencyAutoRefreshMinutes?: number;
  currencyLastSyncAt?: Date;
  currencyRates?: {
    code: string;
    rate: number;
    lastUpdatedAt?: Date;
  }[];
  aiLanguage?: "en" | "lg" | "sw";
  aiTone?: "professional" | "friendly" | "concise" | "brief";
  aiAssistantEnabled?: boolean;
  aiSmartInsightsEnabled?: boolean;
  aiDailySummaryEmailEnabled?: boolean;
  aiDailySummaryEmailTime?: string;
  aiWeeklyReviewEmailEnabled?: boolean;
  aiWeeklyReviewEmailDay?:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  aiLowStockNotificationEnabled?: boolean;
  aiCreditAlertNotificationEnabled?: boolean;
  aiCreditAlertThreshold?: number;
  aiDataUsageAccepted?: boolean;
  aiNotificationsEnabled?: boolean;
  aiModelPreference?:
    | "standard"
    | "advanced"
    | "balanced"
    | "fast"
    | "accurate";
  aiDataPreference?: "strict" | "assisted";
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  plan: "basic" | "professional" | "enterprise";
  planExpiry: Date;
  isActive: boolean;
  settings: ITenantSettings;
  saasProduct: "retail" | "pharmacy" | "clinic";
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logo: { type: String },
    plan: {
      type: String,
      enum: ["basic", "professional", "enterprise"],
      default: "basic",
    },
    planExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    isActive: { type: Boolean, default: true },
    settings: {
      currency: { type: String, default: "UGX" },
      taxRate: { type: Number, default: 18 },
      receiptHeader: { type: String },
      receiptFooter: { type: String },
      lowStockThreshold: { type: Number, default: 10 },
      businessType: { type: String, default: "retail" },
      tinTaxId: { type: String },
      vatRegistrationNo: { type: String },
      physicalAddress: { type: String },
      district: { type: String },
      country: { type: String, default: "Uganda" },
      phoneNumber: { type: String },
      emailAddress: { type: String },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      timeFormat: { type: String, default: "24h" },
      language: { type: String, default: "en" },
      enableSaleLevelDiscount: { type: Boolean, default: false },
      enableItemLevelDiscount: { type: Boolean, default: false },
      discountType: { type: String, default: "percentage" },
      requireDiscountApproval: { type: Boolean, default: false },
      blockSalesOnCreditLimit: { type: Boolean, default: false },
      enableAutoPriceMemory: { type: Boolean, default: false },
      hideFinancials: { type: Boolean, default: false },
      enableBarcodeScanning: { type: Boolean, default: false },
      allowNegativeStock: { type: Boolean, default: false },
      maxNegativeStockQty: { type: Number, default: 0 },
      autoReorderOnNegative: { type: Boolean, default: false },
      notifyOnNegativeStock: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      emailProvider: {
        type: String,
        enum: ["sendgrid", "mailgun", "smtp", "postmark"],
        default: "smtp",
      },
      emailApiKey: { type: String },
      emailSmtpHost: { type: String },
      emailSmtpPort: { type: Number, default: 587 },
      emailSmtpUser: { type: String },
      emailSmtpPassword: { type: String },
      emailFromName: { type: String },
      emailFromAddress: { type: String },
      emailReplyToAddress: { type: String },
      emailReceiptAutoSend: { type: Boolean, default: false },
      emailInvoiceAutoSend: { type: Boolean, default: false },
      emailBalanceReminderEnabled: { type: Boolean, default: false },
      emailBalanceReminderFrequency: {
        type: String,
        enum: ["daily", "weekly", "overdue"],
        default: "weekly",
      },
      stockLevelAlerts: { type: Boolean, default: true },
      reorderAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      systemUpdates: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false },
      twoFactorAuth: { type: Boolean, default: false },
      auditLog: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 30 },
      passwordRequirement: { type: String, default: "basic" },
      theme: { type: String, default: "light" },
      itemsPerPage: { type: Number, default: 25 },
      showPreviewImages: { type: Boolean, default: true },
      sidebarDefaultCollapsed: { type: Boolean, default: false },
      enableAnimations: { type: Boolean, default: true },
      defaultReportPeriod: { type: String, default: "monthly" },
      autoGenerateReports: { type: Boolean, default: false },
      defaultUserRole: { type: String, default: "cashier" },
      allowEmailVerify: { type: Boolean, default: true },
      allowSelfRegistration: { type: Boolean, default: false },
      enableTaxes: { type: Boolean, default: true },
      allowItemLevelTax: { type: Boolean, default: false },
      taxName: { type: String, default: "VAT" },
      taxNumber: { type: String },
      fiscalYearStart: { type: String, default: "01-01" },
      fiscalYearEnd: { type: String, default: "12-31" },
      currentFiscalYear: { type: String },
      autoArchiveAfterDays: { type: Number, default: 365 },
      archiveEnabled: { type: Boolean, default: false },
      legacyMode: { type: Boolean, default: false },
      rolePermissions: { type: Schema.Types.Mixed, default: {} },
      customRoles: [
        {
          key: { type: String, required: true },
          name: { type: String, required: true },
          permissions: [{ type: String }],
          isActive: { type: Boolean, default: true },
        },
      ],
      currencyRateSource: {
        type: String,
        enum: ["manual", "api"],
        default: "manual",
      },
      currencyAutoRefreshMinutes: { type: Number, default: 60 },
      currencyLastSyncAt: { type: Date },
      currencyRates: [
        {
          code: { type: String, required: true },
          rate: { type: Number, required: true },
          lastUpdatedAt: { type: Date },
        },
      ],
      aiLanguage: {
        type: String,
        enum: ["en", "lg", "sw"],
        default: "en",
      },
      aiTone: {
        type: String,
        enum: ["professional", "friendly", "concise", "brief"],
        default: "professional",
      },
      aiAssistantEnabled: { type: Boolean, default: true },
      aiSmartInsightsEnabled: { type: Boolean, default: true },
      aiDailySummaryEmailEnabled: { type: Boolean, default: false },
      aiDailySummaryEmailTime: { type: String, default: "18:00" },
      aiWeeklyReviewEmailEnabled: { type: Boolean, default: false },
      aiWeeklyReviewEmailDay: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        default: "monday",
      },
      aiLowStockNotificationEnabled: { type: Boolean, default: true },
      aiCreditAlertNotificationEnabled: { type: Boolean, default: false },
      aiCreditAlertThreshold: { type: Number, default: 250000 },
      aiDataUsageAccepted: { type: Boolean, default: true },
      aiNotificationsEnabled: { type: Boolean, default: true },
      aiModelPreference: {
        type: String,
        enum: ["standard", "advanced", "balanced", "fast", "accurate"],
        default: "standard",
      },
      aiDataPreference: {
        type: String,
        enum: ["strict", "assisted"],
        default: "assisted",
      },
    },
    saasProduct: {
      type: String,
      enum: ["retail", "pharmacy", "clinic"],
      default: "retail",
    },
  },
  { timestamps: true },
);

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
export default Tenant;
