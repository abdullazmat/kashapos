import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenantSettings {
  currency: string;
  taxRate: number;
  receiptHeader?: string;
  receiptFooter?: string;
  lowStockThreshold: number;
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
