"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  Users,
  Building2,
  Save,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Shield,
  MapPin,
  Phone,
  User,
  Bell,
  Mail,
  Lock,
  Monitor,
  BarChart3,
  Receipt,
  Tag,
  DollarSign,
  Package,
  Calendar,
  Archive,
  Layers,
  RotateCcw,
  Eye,
  EyeOff,
  Scan,
  Clock,
  Globe,
  Percent,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/app/dashboard/layout";
import { formatCurrency, getDefaultCurrencyRates } from "@/lib/utils";
import {
  CORE_ROLES,
  MODULE_PERMISSIONS,
  ROLE_LABELS,
  getDefaultPermissionsForRole,
  getRoleLabel,
} from "@/lib/roles";

interface CurrencyRate {
  code: string;
  rate: number;
  lastUpdatedAt?: string;
}

interface CustomRole {
  key: string;
  name: string;
  permissions: string[];
  isActive: boolean;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  branchId?: { _id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

interface BranchItem {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain: boolean;
}

interface FiscalYearItem {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  cycle: "ura_jul_jun" | "calendar_jan_dec" | "custom";
  status: "active" | "closed" | "archived";
  createdAt: string;
}

interface FiscalSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  vatCollected: number;
  outstandingInvoices: { count: number; total: number };
  monthlyRevenueVsExpenses: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
  topProductCategories: { category: string; revenue: number }[];
}

type SettingsSection =
  | "general"
  | "email"
  | "discount"
  | "financial"
  | "currency"
  | "inventory"
  | "notifications"
  | "security"
  | "display"
  | "reports"
  | "users"
  | "tax"
  | "branches"
  | "fiscal"
  | "archive"
  | "legacy"
  | "stock";

interface SectionDef {
  key: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const sections: SectionDef[] = [
  { key: "general", label: "General", icon: Settings, group: "APPLICATION" },
  { key: "email", label: "Email", icon: Mail, group: "APPLICATION" },
  { key: "display", label: "Display", icon: Monitor, group: "APPLICATION" },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    group: "APPLICATION",
  },
  { key: "discount", label: "Discount", icon: Tag, group: "BUSINESS" },
  { key: "financial", label: "Financial", icon: DollarSign, group: "BUSINESS" },
  { key: "tax", label: "Tax", icon: Receipt, group: "BUSINESS" },
  { key: "currency", label: "Currency", icon: Globe, group: "BUSINESS" },
  { key: "fiscal", label: "Fiscal Year", icon: Calendar, group: "BUSINESS" },
  { key: "inventory", label: "Inventory", icon: Package, group: "OPERATIONS" },
  {
    key: "stock",
    label: "Stock Management",
    icon: Layers,
    group: "OPERATIONS",
  },
  { key: "users", label: "Users", icon: Users, group: "OPERATIONS" },
  { key: "branches", label: "Branches", icon: Building2, group: "OPERATIONS" },
  { key: "security", label: "Security", icon: Lock, group: "SYSTEM" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "SYSTEM" },
  { key: "archive", label: "Archive", icon: Archive, group: "SYSTEM" },
  { key: "legacy", label: "Legacy", icon: Layers, group: "SYSTEM" },
];

const sectionGroups = ["APPLICATION", "BUSINESS", "OPERATIONS", "SYSTEM"];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && (
          <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user, tenant } = useSession();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Settings state
  const [s, setS] = useState({
    businessName: "",
    logo: "",
    currency: "UGX",
    taxRate: 0,
    receiptHeader: "",
    receiptFooter: "",
    lowStockThreshold: 10,
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    language: "en",
    enableSaleLevelDiscount: false,
    enableItemLevelDiscount: false,
    discountType: "percentage",
    requireDiscountApproval: false,
    blockSalesOnCreditLimit: false,
    enableAutoPriceMemory: false,
    hideFinancials: false,
    enableBarcodeScanning: false,
    allowNegativeStock: false,
    maxNegativeStockQty: 0,
    autoReorderOnNegative: false,
    notifyOnNegativeStock: true,
    emailNotifications: true,
    emailProvider: "smtp",
    emailApiKey: "",
    emailSmtpHost: "",
    emailSmtpPort: 587,
    emailSmtpUser: "",
    emailSmtpPassword: "",
    emailFromName: "",
    emailFromAddress: "",
    emailReplyToAddress: "",
    emailReceiptAutoSend: false,
    emailInvoiceAutoSend: false,
    emailBalanceReminderEnabled: false,
    emailBalanceReminderFrequency: "weekly",
    stockLevelAlerts: true,
    reorderAlerts: true,
    pushNotifications: false,
    systemUpdates: true,
    weeklyReports: false,
    twoFactorAuth: false,
    auditLog: true,
    sessionTimeout: 30,
    passwordRequirement: "basic",
    theme: "light",
    itemsPerPage: 25,
    showPreviewImages: true,
    sidebarDefaultCollapsed: false,
    enableAnimations: true,
    defaultReportPeriod: "monthly",
    autoGenerateReports: false,
    defaultUserRole: "cashier",
    allowEmailVerify: true,
    allowSelfRegistration: false,
    enableTaxes: true,
    allowItemLevelTax: false,
    taxName: "VAT",
    taxNumber: "",
    fiscalYearStart: "01-01",
    fiscalYearEnd: "12-31",
    currentFiscalYear: "",
    autoArchiveAfterDays: 365,
    archiveEnabled: false,
    legacyMode: false,
    rolePermissions: Object.fromEntries(
      CORE_ROLES.map((role) => [role, getDefaultPermissionsForRole(role)]),
    ) as Record<string, string[]>,
    customRoles: [] as CustomRole[],
    currencyRateSource: "manual" as "manual" | "api",
    currencyAutoRefreshMinutes: 60,
    currencyLastSyncAt: "",
    currencyRates: getDefaultCurrencyRates("UGX") as CurrencyRate[],
  });

  const [currencyTestAmount, setCurrencyTestAmount] = useState("1000");
  const [currencyTestFrom, setCurrencyTestFrom] = useState("UGX");
  const [currencyTestTo, setCurrencyTestTo] = useState("USD");
  const [currencyRateStatus, setCurrencyRateStatus] = useState("");
  const [syncingRates, setSyncingRates] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");

  const [settingsCreatedAt, setSettingsCreatedAt] = useState("");
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const [fiscalYears, setFiscalYears] = useState<FiscalYearItem[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState("");
  const [fiscalSummary, setFiscalSummary] = useState<FiscalSummary | null>(
    null,
  );
  const [fiscalTab, setFiscalTab] = useState<"config" | "summary" | "archive">(
    "config",
  );
  const [newFiscalYear, setNewFiscalYear] = useState({
    label: "",
    startDate: "",
    endDate: "",
    cycle: "ura_jul_jun",
    setActive: true,
  });

  useEffect(() => {
    const section = searchParams.get("section") as SettingsSection | null;
    const tab = searchParams.get("tab");
    if (!section) return;
    const allowed: SettingsSection[] = [
      "general",
      "email",
      "discount",
      "financial",
      "currency",
      "inventory",
      "notifications",
      "security",
      "display",
      "reports",
      "users",
      "tax",
      "branches",
      "fiscal",
      "archive",
      "legacy",
      "stock",
    ];
    if (allowed.includes(section)) {
      setActiveSection(section);
    }

    if (section === "fiscal" && tab) {
      if (tab === "config" || tab === "configuration") {
        setFiscalTab("config");
      } else if (tab === "summary" || tab === "financial-summary") {
        setFiscalTab("summary");
      } else if (tab === "archive" || tab === "archive-management") {
        setFiscalTab("archive");
      }
    }
  }, [searchParams]);

  // Users
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("cashier");
  const [userBranch, setUserBranch] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState("");

  // Branches
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [savingBranch, setSavingBranch] = useState(false);

  const applyThemeSetting = useCallback((theme: string) => {
    const useDark = theme === "dark";
    document.documentElement.classList.toggle("dark", useDark);
    try {
      localStorage.setItem("meka-dark-mode", useDark ? "1" : "0");
    } catch {}
    window.dispatchEvent(
      new CustomEvent("meka-theme-change", { detail: { theme } }),
    );
  }, []);

  // Load settings from tenant
  useEffect(() => {
    if (tenant) {
      const ts = tenant.settings || {};
      setS((prev) => ({
        ...prev,
        businessName: tenant.name || "",
        logo: tenant.logo || "",
        currency: ts.currency || "UGX",
        taxRate: ts.taxRate || 0,
        receiptHeader: ts.receiptHeader || "",
        receiptFooter: ts.receiptFooter || "",
        lowStockThreshold: ts.lowStockThreshold || 10,
        ...Object.fromEntries(
          Object.keys(prev)
            .filter(
              (k) =>
                k !== "businessName" &&
                k !== "currency" &&
                k !== "taxRate" &&
                k !== "receiptHeader" &&
                k !== "receiptFooter" &&
                k !== "lowStockThreshold",
            )
            .map((k) => [
              k,
              (ts as Record<string, unknown>)[k] ??
                (prev as Record<string, unknown>)[k],
            ]),
        ),
      }));
    }
  }, [tenant]);

  // Load full settings from API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettingsCreatedAt(data.createdAt || "");
          setSettingsUpdatedAt(data.updatedAt || "");
          if (data.settings) {
            const ts = data.settings;
            setS((prev) => ({
              ...prev,
              businessName: data.name || prev.businessName,
              logo:
                typeof data.logo === "string" ? data.logo : (prev.logo ?? ""),
              currency: ts.currency || prev.currency,
              taxRate: ts.taxRate ?? prev.taxRate,
              receiptHeader: ts.receiptHeader || prev.receiptHeader,
              receiptFooter: ts.receiptFooter || prev.receiptFooter,
              lowStockThreshold: ts.lowStockThreshold ?? prev.lowStockThreshold,
              dateFormat: ts.dateFormat || prev.dateFormat,
              timeFormat: ts.timeFormat || prev.timeFormat,
              language: ts.language || prev.language,
              enableSaleLevelDiscount:
                ts.enableSaleLevelDiscount ?? prev.enableSaleLevelDiscount,
              enableItemLevelDiscount:
                ts.enableItemLevelDiscount ?? prev.enableItemLevelDiscount,
              discountType: ts.discountType || prev.discountType,
              requireDiscountApproval:
                ts.requireDiscountApproval ?? prev.requireDiscountApproval,
              blockSalesOnCreditLimit:
                ts.blockSalesOnCreditLimit ?? prev.blockSalesOnCreditLimit,
              enableAutoPriceMemory:
                ts.enableAutoPriceMemory ?? prev.enableAutoPriceMemory,
              hideFinancials: ts.hideFinancials ?? prev.hideFinancials,
              enableBarcodeScanning:
                ts.enableBarcodeScanning ?? prev.enableBarcodeScanning,
              allowNegativeStock:
                ts.allowNegativeStock ?? prev.allowNegativeStock,
              maxNegativeStockQty:
                ts.maxNegativeStockQty ?? prev.maxNegativeStockQty,
              autoReorderOnNegative:
                ts.autoReorderOnNegative ?? prev.autoReorderOnNegative,
              notifyOnNegativeStock:
                ts.notifyOnNegativeStock ?? prev.notifyOnNegativeStock,
              emailNotifications:
                ts.emailNotifications ?? prev.emailNotifications,
              emailProvider: ts.emailProvider || prev.emailProvider,
              emailApiKey: ts.emailApiKey || prev.emailApiKey,
              emailSmtpHost: ts.emailSmtpHost || prev.emailSmtpHost,
              emailSmtpPort: ts.emailSmtpPort ?? prev.emailSmtpPort,
              emailSmtpUser: ts.emailSmtpUser || prev.emailSmtpUser,
              emailSmtpPassword: ts.emailSmtpPassword || prev.emailSmtpPassword,
              emailFromName: ts.emailFromName || prev.emailFromName,
              emailFromAddress: ts.emailFromAddress || prev.emailFromAddress,
              emailReplyToAddress:
                ts.emailReplyToAddress || prev.emailReplyToAddress,
              emailReceiptAutoSend:
                ts.emailReceiptAutoSend ?? prev.emailReceiptAutoSend,
              emailInvoiceAutoSend:
                ts.emailInvoiceAutoSend ?? prev.emailInvoiceAutoSend,
              emailBalanceReminderEnabled:
                ts.emailBalanceReminderEnabled ??
                prev.emailBalanceReminderEnabled,
              emailBalanceReminderFrequency:
                ts.emailBalanceReminderFrequency ||
                prev.emailBalanceReminderFrequency,
              stockLevelAlerts: ts.stockLevelAlerts ?? prev.stockLevelAlerts,
              reorderAlerts: ts.reorderAlerts ?? prev.reorderAlerts,
              pushNotifications: ts.pushNotifications ?? prev.pushNotifications,
              systemUpdates: ts.systemUpdates ?? prev.systemUpdates,
              weeklyReports: ts.weeklyReports ?? prev.weeklyReports,
              twoFactorAuth: ts.twoFactorAuth ?? prev.twoFactorAuth,
              auditLog: ts.auditLog ?? prev.auditLog,
              sessionTimeout: ts.sessionTimeout ?? prev.sessionTimeout,
              passwordRequirement:
                ts.passwordRequirement || prev.passwordRequirement,
              theme: ts.theme || prev.theme,
              itemsPerPage: ts.itemsPerPage ?? prev.itemsPerPage,
              showPreviewImages: ts.showPreviewImages ?? prev.showPreviewImages,
              sidebarDefaultCollapsed:
                ts.sidebarDefaultCollapsed ?? prev.sidebarDefaultCollapsed,
              enableAnimations: ts.enableAnimations ?? prev.enableAnimations,
              defaultReportPeriod:
                ts.defaultReportPeriod || prev.defaultReportPeriod,
              autoGenerateReports:
                ts.autoGenerateReports ?? prev.autoGenerateReports,
              defaultUserRole: ts.defaultUserRole || prev.defaultUserRole,
              allowEmailVerify: ts.allowEmailVerify ?? prev.allowEmailVerify,
              allowSelfRegistration:
                ts.allowSelfRegistration ?? prev.allowSelfRegistration,
              enableTaxes: ts.enableTaxes ?? prev.enableTaxes,
              allowItemLevelTax: ts.allowItemLevelTax ?? prev.allowItemLevelTax,
              taxName: ts.taxName || prev.taxName,
              taxNumber: ts.taxNumber || prev.taxNumber,
              fiscalYearStart: ts.fiscalYearStart || prev.fiscalYearStart,
              fiscalYearEnd: ts.fiscalYearEnd || prev.fiscalYearEnd,
              currentFiscalYear: ts.currentFiscalYear || prev.currentFiscalYear,
              autoArchiveAfterDays:
                ts.autoArchiveAfterDays ?? prev.autoArchiveAfterDays,
              archiveEnabled: ts.archiveEnabled ?? prev.archiveEnabled,
              legacyMode: ts.legacyMode ?? prev.legacyMode,
              rolePermissions:
                (ts.rolePermissions as Record<string, string[]>) ||
                prev.rolePermissions,
              customRoles: (ts.customRoles as CustomRole[]) || prev.customRoles,
              currencyRateSource:
                (ts.currencyRateSource as "manual" | "api") ||
                prev.currencyRateSource,
              currencyAutoRefreshMinutes:
                ts.currencyAutoRefreshMinutes ??
                prev.currencyAutoRefreshMinutes,
              currencyLastSyncAt:
                (ts.currencyLastSyncAt as string) || prev.currencyLastSyncAt,
              currencyRates:
                (ts.currencyRates as CurrencyRate[]) || prev.currencyRates,
            }));
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoadingUsers(false);
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) setBranches(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (res.ok) {
        applyThemeSetting(s.theme);
        window.dispatchEvent(
          new CustomEvent("meka-settings-updated", {
            detail: {
              currency: s.currency,
              currencyRates: s.currencyRates,
              currencyLedger: s.currency,
            },
          }),
        );
        setSaveMsg({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        const data = await res.json();
        setSaveMsg({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setSaveMsg({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  const handleResetDefaults = () => {
    if (!confirm("Reset all settings to defaults? This cannot be undone."))
      return;
    applyThemeSetting("light");
    setS({
      businessName: s.businessName,
      logo: s.logo,
      currency: "UGX",
      taxRate: 18,
      receiptHeader: "",
      receiptFooter: "",
      lowStockThreshold: 10,
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      language: "en",
      enableSaleLevelDiscount: false,
      enableItemLevelDiscount: false,
      discountType: "percentage",
      requireDiscountApproval: false,
      blockSalesOnCreditLimit: false,
      enableAutoPriceMemory: false,
      hideFinancials: false,
      enableBarcodeScanning: false,
      allowNegativeStock: false,
      maxNegativeStockQty: 0,
      autoReorderOnNegative: false,
      notifyOnNegativeStock: true,
      emailNotifications: true,
      emailProvider: "smtp",
      emailApiKey: "",
      emailSmtpHost: "",
      emailSmtpPort: 587,
      emailSmtpUser: "",
      emailSmtpPassword: "",
      emailFromName: "",
      emailFromAddress: "",
      emailReplyToAddress: "",
      emailReceiptAutoSend: false,
      emailInvoiceAutoSend: false,
      emailBalanceReminderEnabled: false,
      emailBalanceReminderFrequency: "weekly",
      stockLevelAlerts: true,
      reorderAlerts: true,
      pushNotifications: false,
      systemUpdates: true,
      weeklyReports: false,
      twoFactorAuth: false,
      auditLog: true,
      sessionTimeout: 30,
      passwordRequirement: "basic",
      theme: "light",
      itemsPerPage: 25,
      showPreviewImages: true,
      sidebarDefaultCollapsed: false,
      enableAnimations: true,
      defaultReportPeriod: "monthly",
      autoGenerateReports: false,
      defaultUserRole: "cashier",
      allowEmailVerify: true,
      allowSelfRegistration: false,
      enableTaxes: true,
      allowItemLevelTax: false,
      taxName: "VAT",
      taxNumber: "",
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31",
      currentFiscalYear: "",
      autoArchiveAfterDays: 365,
      archiveEnabled: false,
      legacyMode: false,
      rolePermissions: Object.fromEntries(
        CORE_ROLES.map((role) => [role, getDefaultPermissionsForRole(role)]),
      ) as Record<string, string[]>,
      customRoles: [],
      currencyRateSource: "manual",
      currencyAutoRefreshMinutes: 60,
      currencyLastSyncAt: "",
      currencyRates: getDefaultCurrencyRates("UGX"),
    });
  };

  const upd = (field: string, value: unknown) =>
    setS((prev) => ({ ...prev, [field]: value }));

  const handleLogoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveMsg({ type: "error", text: "Please upload an image file." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSaveMsg({ type: "error", text: "Logo must be 2MB or smaller." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      upd("logo", String(reader.result || ""));
      setSaveMsg(null);
    };
    reader.onerror = () => {
      setSaveMsg({ type: "error", text: "Failed to read logo file." });
    };
    reader.readAsDataURL(file);
  };

  const handleThemeSelect = (theme: "light" | "dark") => {
    upd("theme", theme);
    applyThemeSetting(theme);
  };

  const fetchFiscalYears = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFiscalYearId)
        params.set("fiscalYearId", selectedFiscalYearId);
      const res = await fetch(`/api/fiscal-years?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setFiscalYears(data.fiscalYears || []);
      if (data.selectedFiscalYearId)
        setSelectedFiscalYearId(data.selectedFiscalYearId);
      setFiscalSummary(data.summary || null);
    } catch {
      // ignore
    }
  }, [selectedFiscalYearId]);

  useEffect(() => {
    fetchFiscalYears();
  }, [fetchFiscalYears]);

  const refreshCurrencyRates = useCallback(async () => {
    if (s.currencyRateSource !== "api") return;
    setSyncingRates(true);
    setCurrencyRateStatus("");
    try {
      const res = await fetch(
        `https://open.er-api.com/v6/latest/${s.currency}`,
      );
      const data = await res.json();
      if (!res.ok || data?.result === "error" || !data?.rates) {
        setCurrencyRateStatus("Failed to refresh rates from provider");
        return;
      }
      const now = new Date().toISOString();
      const nextRates = s.currencyRates
        .map((row) => {
          const rate = Number(data.rates[row.code]);
          if (!Number.isFinite(rate) || rate <= 0) return row;
          return { ...row, rate, lastUpdatedAt: now };
        })
        .filter((row) => row.code !== s.currency);

      setS((prev) => ({
        ...prev,
        currencyRates: nextRates,
        currencyLastSyncAt: now,
      }));
      setCurrencyRateStatus("Rates refreshed successfully");
    } catch {
      setCurrencyRateStatus("Failed to refresh rates from provider");
    }
    setSyncingRates(false);
  }, [s.currency, s.currencyRateSource, s.currencyRates]);

  useEffect(() => {
    if (s.currencyRateSource !== "api") return;
    const intervalMs = Math.max(5, s.currencyAutoRefreshMinutes || 60) * 60000;
    const id = window.setInterval(() => {
      void refreshCurrencyRates();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [
    s.currencyRateSource,
    s.currencyAutoRefreshMinutes,
    refreshCurrencyRates,
  ]);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) return;
    setTestingEmail(true);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailAddress.trim() }),
      });
      const data = await res.json();
      setSaveMsg({
        type: res.ok ? "success" : "error",
        text: data.message || data.error || "Email test request failed",
      });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to send test email" });
    }
    setTestingEmail(false);
  };

  const handleCreateFiscalYear = async () => {
    if (
      !newFiscalYear.label ||
      !newFiscalYear.startDate ||
      !newFiscalYear.endDate
    )
      return;
    try {
      const res = await fetch("/api/fiscal-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFiscalYear),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({
          type: "error",
          text: data.error || "Failed to create fiscal year",
        });
        return;
      }
      setSaveMsg({ type: "success", text: "Fiscal year created" });
      setNewFiscalYear({
        label: "",
        startDate: "",
        endDate: "",
        cycle: "ura_jul_jun",
        setActive: true,
      });
      fetchFiscalYears();
    } catch {
      setSaveMsg({ type: "error", text: "Failed to create fiscal year" });
    }
  };

  const runFiscalAction = async (
    fiscalYearId: string,
    action: "set-active" | "close" | "archive",
  ) => {
    if (action === "archive") {
      const confirmed = confirm(
        "Archive this fiscal year? All records for this period will be locked permanently.",
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({
          type: "error",
          text: data.error || "Fiscal year update failed",
        });
        return;
      }
      setSaveMsg({ type: "success", text: "Fiscal year updated" });
      fetchFiscalYears();
    } catch {
      setSaveMsg({ type: "error", text: "Fiscal year update failed" });
    }
  };

  // User handlers
  const handleAddUser = async () => {
    if (!userName || !userEmail || !userPassword) return;
    setSavingUser(true);
    setUserError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
          branchId: userBranch || undefined,
        }),
      });
      if (res.ok) {
        setShowUserModal(false);
        setUserName("");
        setUserEmail("");
        setUserPassword("");
        setUserRole("cashier");
        setUserBranch("");
        fetchUsers();
      } else {
        const data = await res.json();
        setUserError(data.error || "Failed to create user");
      }
    } catch {
      setUserError("Network error");
    }
    setSavingUser(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Network error");
    }
  };

  // Branch handlers
  const openBranchModal = (branch?: BranchItem) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchName(branch.name);
      setBranchCode(branch.code);
      setBranchAddress(branch.address || "");
      setBranchPhone(branch.phone || "");
    } else {
      setEditingBranch(null);
      setBranchName("");
      setBranchCode("");
      setBranchAddress("");
      setBranchPhone("");
    }
    setShowBranchModal(true);
  };

  const handleSaveBranch = async () => {
    if (!branchName || !branchCode) return;
    setSavingBranch(true);
    try {
      const payload = {
        name: branchName,
        code: branchCode,
        address: branchAddress,
        phone: branchPhone,
      };
      const res = editingBranch
        ? await fetch("/api/branches", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: editingBranch._id, ...payload }),
          })
        : await fetch("/api/branches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setShowBranchModal(false);
        fetchBranches();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save branch");
      }
    } catch {
      alert("Network error");
    }
    setSavingBranch(false);
  };

  const handleDeleteBranch = async (branch: BranchItem) => {
    if (branch.isMain) {
      alert("Cannot delete the main branch.");
      return;
    }
    if (!confirm(`Deactivate branch "${branch.name}"?`)) return;
    try {
      const res = await fetch(
        `/api/branches?id=${encodeURIComponent(branch._id)}`,
        { method: "DELETE" },
      );
      if (res.ok) fetchBranches();
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete branch");
      }
    } catch {
      alert("Network error");
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-50 text-purple-600 ring-purple-600/20",
      store_manager: "bg-blue-50 text-blue-600 ring-blue-600/20",
      warehouse_manager: "bg-indigo-50 text-indigo-600 ring-indigo-600/20",
      accountant: "bg-emerald-50 text-emerald-600 ring-emerald-600/20",
      cashier: "bg-amber-50 text-amber-600 ring-amber-600/20",
      customer_service: "bg-cyan-50 text-cyan-700 ring-cyan-700/20",
      inventory_clerk: "bg-orange-50 text-orange-600 ring-orange-600/20",
      manager: "bg-slate-50 text-slate-600 ring-slate-600/20",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${colors[role] || "bg-gray-50 text-gray-600 ring-gray-600/20"}`}
      >
        {getRoleLabel(role)}
      </span>
    );
  };

  const allAvailableRoles = [
    ...CORE_ROLES,
    ...s.customRoles.filter((r) => r.isActive).map((r) => r.key),
  ];

  const togglePermission = (role: string, module: string) => {
    setS((prev) => {
      const current = prev.rolePermissions[role] || [];
      const next = current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module];
      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [role]: next,
        },
      };
    });
  };

  const addCustomRole = () => {
    const cleanedName = customRoleName.trim();
    if (!cleanedName) return;
    const key = cleanedName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (!key) return;
    if (allAvailableRoles.includes(key)) {
      setSaveMsg({ type: "error", text: "Role already exists" });
      return;
    }
    setS((prev) => ({
      ...prev,
      customRoles: [
        ...prev.customRoles,
        {
          key,
          name: cleanedName,
          permissions: ["dashboard"],
          isActive: true,
        },
      ],
      rolePermissions: {
        ...prev.rolePermissions,
        [key]: ["dashboard"],
      },
    }));
    setCustomRoleName("");
  };

  const removeCustomRole = (key: string) => {
    setS((prev) => {
      const nextPermissions = { ...prev.rolePermissions };
      delete nextPermissions[key];
      return {
        ...prev,
        customRoles: prev.customRoles.filter((r) => r.key !== key),
        rolePermissions: nextPermissions,
      };
    });
    if (userRole === key) setUserRole("cashier");
  };

  const handleBaseCurrencyChange = (nextCurrency: string) => {
    if (nextCurrency === s.currency) return;
    const applyExisting = confirm(
      `Switch base currency to ${nextCurrency}? Choose OK to also flag existing records for conversion guidance.`,
    );
    const rebuiltRates = getDefaultCurrencyRates(nextCurrency);

    setS((prev) => ({
      ...prev,
      currency: nextCurrency,
      currencyRates: rebuiltRates,
      ...(applyExisting
        ? {
            receiptFooter:
              `${prev.receiptFooter || ""}\n[Note] Currency changed to ${nextCurrency}. Review legacy price records for conversion.`.trim(),
          }
        : {}),
    }));
  };

  const testConvertedAmount = (() => {
    const amount = Number(currencyTestAmount || 0);
    if (!Number.isFinite(amount)) return 0;
    if (currencyTestFrom === currencyTestTo) return amount;

    const fromRate =
      currencyTestFrom === s.currency
        ? 1
        : (s.currencyRates.find((r) => r.code === currencyTestFrom)?.rate ?? 0);
    const toRate =
      currencyTestTo === s.currency
        ? 1
        : (s.currencyRates.find((r) => r.code === currencyTestTo)?.rate ?? 0);

    if (!fromRate || !toRate) return 0;
    return (amount / fromRate) * toRate;
  })();

  const SectionCard = ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-base font-bold text-gray-800">{title}</h3>
      {description && (
        <p className="text-[13px] text-gray-400 mb-5">{description}</p>
      )}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Settings</h1>
            <p className="text-[13px] text-gray-400">
              Manage application configuration and preferences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <div
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${saveMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {saveMsg.type === "success" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {saveMsg.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Mobile section picker */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700"
        >
          <span className="flex items-center gap-2">
            {(() => {
              const sec = sections.find((x) => x.key === activeSection);
              return sec ? (
                <>
                  <sec.icon className="h-4 w-4" /> {sec.label}
                </>
              ) : null;
            })()}
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${mobileSidebarOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {mobileSidebarOpen && (
          <div className="mt-2 rounded-xl border border-gray-100 bg-white shadow-lg p-2 space-y-1 max-h-80 overflow-y-auto">
            {sectionGroups.map((group) => (
              <div key={group}>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  {group}
                </p>
                {sections
                  .filter((x) => x.group === group)
                  .map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => {
                        setActiveSection(sec.key);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeSection === sec.key ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      <sec.icon className="h-4 w-4" /> {sec.label}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-4">
            {sectionGroups.map((group) => (
              <div key={group}>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  {group}
                </p>
                <div className="space-y-0.5 mt-1">
                  {sections
                    .filter((x) => x.group === group)
                    .map((sec) => (
                      <button
                        key={sec.key}
                        onClick={() => setActiveSection(sec.key)}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${activeSection === sec.key ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
                      >
                        <sec.icon className="h-4 w-4" /> {sec.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ═══════ GENERAL ═══════ */}
          {activeSection === "general" && (
            <SectionCard
              title="General Settings"
              description="Date, time format, currency, and language preferences"
            >
              <div className="max-w-lg space-y-4">
                <div>
                  <label className={labelClass}>Business Name</label>
                  <input
                    type="text"
                    value={s.businessName}
                    onChange={(e) => upd("businessName", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Business Logo</label>
                  <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[10px] text-gray-400">
                        {s.logo ? (
                          <img
                            src={s.logo}
                            alt="Business logo"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          "No logo"
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={s.logo}
                          onChange={(e) => upd("logo", e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Paste logo URL or upload image below"
                        />
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                            Upload Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoFileUpload}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => upd("logo", "")}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Recommended: square PNG/JPG, up to 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date Format</label>
                    <select
                      value={s.dateFormat}
                      onChange={(e) => upd("dateFormat", e.target.value)}
                      className={inputClass}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Time Format</label>
                    <select
                      value={s.timeFormat}
                      onChange={(e) => upd("timeFormat", e.target.value)}
                      className={inputClass}
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select
                      value={s.currency}
                      onChange={(e) => upd("currency", e.target.value)}
                      className={inputClass}
                    >
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="RWF">RWF - Rwandan Franc</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                      <option value="GHS">GHS - Ghanaian Cedi</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Language</label>
                    <select
                      value={s.language}
                      onChange={(e) => upd("language", e.target.value)}
                      className={inputClass}
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Receipt Header</label>
                  <textarea
                    rows={2}
                    value={s.receiptHeader}
                    onChange={(e) => upd("receiptHeader", e.target.value)}
                    className={inputClass}
                    placeholder="Text printed at the top of receipts"
                  />
                </div>
                <div>
                  <label className={labelClass}>Receipt Footer</label>
                  <textarea
                    rows={2}
                    value={s.receiptFooter}
                    onChange={(e) => upd("receiptFooter", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Thank you for your purchase!"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ EMAIL ═══════ */}
          {activeSection === "email" && (
            <SectionCard
              title="Email Integration"
              description="Configure in-app email sending for receipts, invoices, and balance reminders"
            >
              <div className="max-w-3xl space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Email Provider</label>
                    <select
                      value={s.emailProvider}
                      onChange={(e) => upd("emailProvider", e.target.value)}
                      className={inputClass}
                    >
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="smtp">SMTP</option>
                      <option value="postmark">Postmark</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>API Key (Optional)</label>
                    <input
                      type="password"
                      value={s.emailApiKey}
                      onChange={(e) => upd("emailApiKey", e.target.value)}
                      className={inputClass}
                      placeholder="Provider API key"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className={labelClass}>SMTP Host</label>
                    <input
                      value={s.emailSmtpHost}
                      onChange={(e) => upd("emailSmtpHost", e.target.value)}
                      className={inputClass}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP Port</label>
                    <input
                      type="number"
                      value={s.emailSmtpPort}
                      onChange={(e) =>
                        upd("emailSmtpPort", parseInt(e.target.value) || 587)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP User</label>
                    <input
                      value={s.emailSmtpUser}
                      onChange={(e) => upd("emailSmtpUser", e.target.value)}
                      className={inputClass}
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>SMTP Password</label>
                  <input
                    type="password"
                    value={s.emailSmtpPassword}
                    onChange={(e) => upd("emailSmtpPassword", e.target.value)}
                    className={inputClass}
                    placeholder="Stored encrypted at rest"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>From Name</label>
                    <input
                      value={s.emailFromName}
                      onChange={(e) => upd("emailFromName", e.target.value)}
                      className={inputClass}
                      placeholder="MEKA POS"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>From Email Address</label>
                    <input
                      type="email"
                      value={s.emailFromAddress}
                      onChange={(e) => upd("emailFromAddress", e.target.value)}
                      className={inputClass}
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Reply-To Address</label>
                    <input
                      type="email"
                      value={s.emailReplyToAddress}
                      onChange={(e) =>
                        upd("emailReplyToAddress", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    Automation
                  </p>
                  <div className="space-y-1">
                    <Toggle
                      checked={s.emailReceiptAutoSend}
                      onChange={(v) => upd("emailReceiptAutoSend", v)}
                      label="Receipt Auto-Send"
                      description="Automatically email receipt after each sale"
                    />
                    <Toggle
                      checked={s.emailInvoiceAutoSend}
                      onChange={(v) => upd("emailInvoiceAutoSend", v)}
                      label="Invoice Auto-Send"
                      description="Automatically email invoice when created"
                    />
                    <Toggle
                      checked={s.emailBalanceReminderEnabled}
                      onChange={(v) => upd("emailBalanceReminderEnabled", v)}
                      label="Balance Reminder"
                      description="Send reminders to customers with outstanding balances"
                    />
                  </div>
                  {s.emailBalanceReminderEnabled && (
                    <div className="pt-3">
                      <label className={labelClass}>Reminder Frequency</label>
                      <select
                        value={s.emailBalanceReminderFrequency}
                        onChange={(e) =>
                          upd("emailBalanceReminderFrequency", e.target.value)
                        }
                        className={inputClass + " max-w-xs"}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="overdue">On Overdue</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-full max-w-xs">
                    <label className={labelClass}>Test Email Address</label>
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={testingEmail || !testEmailAddress}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {testingEmail ? "Sending..." : "Send Test Email"}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ DISCOUNT ═══════ */}
          {activeSection === "discount" && (
            <SectionCard
              title="Discount Settings"
              description="Configure how discounts are applied to sales"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.enableSaleLevelDiscount}
                  onChange={(v) => {
                    upd("enableSaleLevelDiscount", v);
                    if (v) upd("enableItemLevelDiscount", false);
                  }}
                  label="Enable sale-level discounts"
                  description="Applied to the entire sale transaction"
                />
                <Toggle
                  checked={s.enableItemLevelDiscount}
                  onChange={(v) => {
                    upd("enableItemLevelDiscount", v);
                    if (v) upd("enableSaleLevelDiscount", false);
                  }}
                  label="Enable item-level discounts"
                  description="Applied to individual items in a sale"
                />
                {(s.enableSaleLevelDiscount || s.enableItemLevelDiscount) && (
                  <div className="pt-3 pb-3 border-b border-gray-50">
                    <p className="text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                      Note: Sale-level and item-level discounts cannot be used
                      together in the same transaction.
                    </p>
                  </div>
                )}
                <div className="py-3 border-b border-gray-50">
                  <label className={labelClass}>
                    Discount Calculation Type
                  </label>
                  <div className="mt-2 flex gap-3">
                    {["percentage", "fixed"].map((type) => (
                      <button
                        key={type}
                        onClick={() => upd("discountType", type)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${s.discountType === type ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      >
                        {type === "percentage" ? (
                          <Percent className="h-4 w-4" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                        {type === "percentage" ? "Percentage" : "Fixed Amount"}
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle
                  checked={s.requireDiscountApproval}
                  onChange={(v) => upd("requireDiscountApproval", v)}
                  label="Require discount approval"
                  description="Manager approval needed before applying discounts"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ FINANCIAL ═══════ */}
          {activeSection === "financial" && (
            <SectionCard
              title="Financial Settings"
              description="Configure financial controls and behaviors"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.blockSalesOnCreditLimit}
                  onChange={(v) => upd("blockSalesOnCreditLimit", v)}
                  label="Block sales on credit limit exceeded"
                  description="Prevent sales when customer exceeds their credit limit"
                />
                <Toggle
                  checked={s.enableAutoPriceMemory}
                  onChange={(v) => upd("enableAutoPriceMemory", v)}
                  label="Enable automatic price memory"
                  description="Remember prices based on customer's purchase history"
                />
                <Toggle
                  checked={s.hideFinancials}
                  onChange={(v) => upd("hideFinancials", v)}
                  label="Hide financials"
                  description="Hide financial information from non-admin users"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ CURRENCY ═══════ */}
          {activeSection === "currency" && (
            <SectionCard
              title="Currency Settings"
              description="Configure base currency, conversion source, and live rates"
            >
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Base Currency</label>
                    <select
                      value={s.currency}
                      onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                      className={inputClass}
                    >
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="RWF">RWF - Rwandan Franc</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                      <option value="GHS">GHS - Ghanaian Cedi</option>
                    </select>
                    <p className="mt-1 text-[12px] text-gray-500">
                      Preview:{" "}
                      {new Intl.NumberFormat("en", {
                        style: "currency",
                        currency: s.currency,
                        minimumFractionDigits: 0,
                      }).format(1000)}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Rate Source</label>
                    <select
                      value={s.currencyRateSource}
                      onChange={(e) =>
                        upd("currencyRateSource", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="manual">Manual</option>
                      <option value="api">API (auto-sync)</option>
                    </select>
                    <p className="mt-1 text-[12px] text-gray-500">
                      {s.currencyRateSource === "api"
                        ? "Rates can be refreshed automatically from a public FX provider."
                        : "You control all exchange rates manually."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className={labelClass}>
                      Auto Refresh Interval (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={s.currencyAutoRefreshMinutes}
                      onChange={(e) =>
                        upd(
                          "currencyAutoRefreshMinutes",
                          Math.max(5, Number(e.target.value) || 5),
                        )
                      }
                      className={inputClass + " max-w-[220px]"}
                    />
                    <p className="mt-1 text-[12px] text-gray-500">
                      Last Sync:{" "}
                      {s.currencyLastSyncAt
                        ? new Date(s.currencyLastSyncAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <button
                    onClick={refreshCurrencyRates}
                    disabled={syncingRates || s.currencyRateSource !== "api"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${syncingRates ? "animate-spin" : ""}`}
                    />
                    {syncingRates ? "Refreshing..." : "Refresh Rates"}
                  </button>
                </div>

                {currencyRateStatus && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                    {currencyRateStatus}
                  </div>
                )}

                <div className="rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-700">
                      Exchange Rates
                    </p>
                    <button
                      onClick={() =>
                        setS((prev) => ({
                          ...prev,
                          currencyRates: [
                            ...prev.currencyRates,
                            { code: "USD", rate: 1 },
                          ],
                        }))
                      }
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600"
                    >
                      Add Rate
                    </button>
                  </div>
                  <div className="space-y-2 p-4">
                    {s.currencyRates.map((rate, idx) => (
                      <div
                        key={`${rate.code}-${idx}`}
                        className="grid grid-cols-[110px_1fr_auto] gap-2"
                      >
                        <input
                          value={rate.code}
                          onChange={(e) => {
                            const code = e.target.value
                              .toUpperCase()
                              .slice(0, 3);
                            setS((prev) => ({
                              ...prev,
                              currencyRates: prev.currencyRates.map((r, i) =>
                                i === idx ? { ...r, code } : r,
                              ),
                            }));
                          }}
                          className={inputClass + " mt-0"}
                          placeholder="USD"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          value={rate.rate}
                          onChange={(e) => {
                            const nextRate = Number(e.target.value || 0);
                            setS((prev) => ({
                              ...prev,
                              currencyRates: prev.currencyRates.map((r, i) =>
                                i === idx ? { ...r, rate: nextRate } : r,
                              ),
                            }));
                          }}
                          className={inputClass + " mt-0"}
                          placeholder={`1 ${s.currency} = ?`}
                        />
                        <button
                          onClick={() =>
                            setS((prev) => ({
                              ...prev,
                              currencyRates: prev.currencyRates.filter(
                                (_, i) => i !== idx,
                              ),
                            }))
                          }
                          className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    <p className="text-sm font-semibold text-emerald-800">
                      Test Conversion
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <input
                      type="number"
                      value={currencyTestAmount}
                      onChange={(e) => setCurrencyTestAmount(e.target.value)}
                      className={inputClass + " mt-0"}
                    />
                    <select
                      value={currencyTestFrom}
                      onChange={(e) => setCurrencyTestFrom(e.target.value)}
                      className={inputClass + " mt-0"}
                    >
                      {Array.from(
                        new Set([
                          s.currency,
                          ...s.currencyRates.map((r) => r.code),
                        ]),
                      ).map((code) => (
                        <option key={`from-${code}`} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <select
                      value={currencyTestTo}
                      onChange={(e) => setCurrencyTestTo(e.target.value)}
                      className={inputClass + " mt-0"}
                    >
                      {Array.from(
                        new Set([
                          s.currency,
                          ...s.currencyRates.map((r) => r.code),
                        ]),
                      ).map((code) => (
                        <option key={`to-${code}`} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-800">
                      {new Intl.NumberFormat("en", {
                        style: "currency",
                        currency: currencyTestTo || s.currency,
                        minimumFractionDigits: 2,
                      }).format(testConvertedAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ INVENTORY ═══════ */}
          {activeSection === "inventory" && (
            <SectionCard
              title="Inventory Settings"
              description="Configure barcode scanning and inventory behavior"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.enableBarcodeScanning}
                  onChange={(v) => upd("enableBarcodeScanning", v)}
                  label="Enable barcode scanning"
                  description="Supports hardware scanners and camera-based scanning"
                />
                {s.enableBarcodeScanning && (
                  <div className="py-2 px-3 bg-blue-50 rounded-xl text-[12px] text-blue-700 flex items-center gap-2">
                    <Scan className="h-4 w-4" /> Barcode scanning is active.
                    Connect a scanner or use device camera.
                  </div>
                )}
                <div className="pt-3">
                  <label className={labelClass}>Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={s.lowStockThreshold}
                    onChange={(e) =>
                      upd("lowStockThreshold", parseInt(e.target.value) || 0)
                    }
                    className={inputClass + " max-w-xs"}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Alert when stock falls below this level
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ STOCK MANAGEMENT ═══════ */}
          {activeSection === "stock" && (
            <SectionCard
              title="Stock Management"
              description="Configure stock management and reorder settings"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.allowNegativeStock}
                  onChange={(v) => upd("allowNegativeStock", v)}
                  label="Allow sales when stock is zero or negative"
                  description="Allow transactions even when stock quantity is zero or negative"
                />
                {s.allowNegativeStock && (
                  <div className="py-3 border-b border-gray-50">
                    <label className={labelClass}>
                      Maximum Allowed Negative Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={s.maxNegativeStockQty}
                      onChange={(e) =>
                        upd(
                          "maxNegativeStockQty",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className={inputClass + " max-w-xs"}
                    />
                  </div>
                )}
                <Toggle
                  checked={s.autoReorderOnNegative}
                  onChange={(v) => upd("autoReorderOnNegative", v)}
                  label="Auto-create reorder requests on negative stock"
                  description="Automatically create reorder requests when stock goes negative"
                />
                <Toggle
                  checked={s.notifyOnNegativeStock}
                  onChange={(v) => upd("notifyOnNegativeStock", v)}
                  label="Notify on negative stock levels"
                  description="Send notifications when stock levels go negative"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ NOTIFICATIONS ═══════ */}
          {activeSection === "notifications" && (
            <SectionCard
              title="Notification Settings"
              description="Configure notification preferences"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.emailNotifications}
                  onChange={(v) => upd("emailNotifications", v)}
                  label="Email notifications"
                  description="Receive important updates via email"
                />
                <Toggle
                  checked={s.stockLevelAlerts}
                  onChange={(v) => upd("stockLevelAlerts", v)}
                  label="Stock level alerts"
                  description="Get notified when stock is running low"
                />
                <Toggle
                  checked={s.reorderAlerts}
                  onChange={(v) => upd("reorderAlerts", v)}
                  label="Reorder level alerts"
                  description="Notify when items reach reorder level"
                />
                <Toggle
                  checked={s.pushNotifications}
                  onChange={(v) => upd("pushNotifications", v)}
                  label="Push notifications"
                  description="Browser push notifications for real-time alerts"
                />
                <Toggle
                  checked={s.systemUpdates}
                  onChange={(v) => upd("systemUpdates", v)}
                  label="System updates"
                  description="Get notified about system updates and maintenance"
                />
                <Toggle
                  checked={s.weeklyReports}
                  onChange={(v) => upd("weeklyReports", v)}
                  label="Weekly reports"
                  description="Receive a weekly summary report via email"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ SECURITY ═══════ */}
          {activeSection === "security" && (
            <SectionCard
              title="Security Settings"
              description="Configure security and authentication"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.twoFactorAuth}
                  onChange={(v) => upd("twoFactorAuth", v)}
                  label="Two-factor authentication"
                  description="Require 2FA for all user accounts"
                />
                <Toggle
                  checked={s.auditLog}
                  onChange={(v) => upd("auditLog", v)}
                  label="Audit log"
                  description="Track all user actions for security review"
                />
                <div className="py-3 border-b border-gray-50">
                  <label className={labelClass}>
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={s.sessionTimeout}
                    onChange={(e) =>
                      upd("sessionTimeout", parseInt(e.target.value) || 30)
                    }
                    className={inputClass + " max-w-xs"}
                  />
                  <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Auto-logout after inactivity
                    period
                  </p>
                </div>
                <div className="py-3">
                  <label className={labelClass}>Password Requirement</label>
                  <div className="mt-2 flex gap-3">
                    {[
                      {
                        key: "basic",
                        label: "Basic",
                        desc: "Minimum 6 characters",
                      },
                      {
                        key: "strong",
                        label: "Strong",
                        desc: "8+ chars, uppercase, number, symbol",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => upd("passwordRequirement", opt.key)}
                        className={`flex-1 rounded-xl px-4 py-3 text-left border transition-all ${s.passwordRequirement === opt.key ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <p
                          className={`text-sm font-medium ${s.passwordRequirement === opt.key ? "text-blue-700" : "text-gray-700"}`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ DISPLAY ═══════ */}
          {activeSection === "display" && (
            <SectionCard
              title="Display Settings"
              description="Customize the appearance and layout"
            >
              <div className="max-w-lg space-y-4">
                <div>
                  <label className={labelClass}>Theme</label>
                  <div className="mt-2 flex gap-3">
                    {[
                      { key: "light", label: "Light", icon: "☀️" },
                      { key: "dark", label: "Dark", icon: "🌙" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() =>
                          handleThemeSelect(opt.key as "light" | "dark")
                        }
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border transition-all ${s.theme === opt.key ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      >
                        <span>{opt.icon}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Items Per Page</label>
                  <select
                    value={s.itemsPerPage}
                    onChange={(e) =>
                      upd("itemsPerPage", parseInt(e.target.value))
                    }
                    className={inputClass + " max-w-xs"}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <Toggle
                  checked={s.showPreviewImages}
                  onChange={(v) => upd("showPreviewImages", v)}
                  label="Show preview images"
                  description="Display product images in lists and tables"
                />
                <Toggle
                  checked={s.sidebarDefaultCollapsed}
                  onChange={(v) => upd("sidebarDefaultCollapsed", v)}
                  label="Sidebar collapsed by default"
                  description="Start with the sidebar collapsed on page load"
                />
                <Toggle
                  checked={s.enableAnimations}
                  onChange={(v) => upd("enableAnimations", v)}
                  label="Enable animations"
                  description="Show transition animations throughout the app"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ REPORTS ═══════ */}
          {activeSection === "reports" && (
            <SectionCard
              title="Report Settings"
              description="Configure report generation and defaults"
            >
              <div className="max-w-lg space-y-4">
                <div>
                  <label className={labelClass}>Default Report Period</label>
                  <select
                    value={s.defaultReportPeriod}
                    onChange={(e) => upd("defaultReportPeriod", e.target.value)}
                    className={inputClass + " max-w-xs"}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <Toggle
                  checked={s.showPreviewImages}
                  onChange={(v) => upd("showPreviewImages", v)}
                  label="Show preview images in reports"
                  description="Include product images in generated reports"
                />
                <Toggle
                  checked={s.autoGenerateReports}
                  onChange={(v) => upd("autoGenerateReports", v)}
                  label="Auto-generate reports"
                  description="Automatically generate periodic reports"
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════ TAX ═══════ */}
          {activeSection === "tax" && (
            <SectionCard
              title="Tax Settings"
              description="Configure tax calculation and compliance"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.enableTaxes}
                  onChange={(v) => upd("enableTaxes", v)}
                  label="Enable taxes"
                  description="Apply tax calculation to transactions"
                />
                {s.enableTaxes && (
                  <>
                    <Toggle
                      checked={s.allowItemLevelTax}
                      onChange={(v) => upd("allowItemLevelTax", v)}
                      label="Allow item-level taxes"
                      description="Set different tax rates for individual items"
                    />
                    <div className="space-y-4 pt-3">
                      <div>
                        <label className={labelClass}>
                          Default Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={s.taxRate}
                          onChange={(e) =>
                            upd("taxRate", parseFloat(e.target.value) || 0)
                          }
                          className={inputClass + " max-w-xs"}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Tax Name</label>
                          <input
                            type="text"
                            value={s.taxName}
                            onChange={(e) => upd("taxName", e.target.value)}
                            className={inputClass}
                            placeholder="e.g. VAT"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tax Number (TIN)</label>
                          <input
                            type="text"
                            value={s.taxNumber}
                            onChange={(e) => upd("taxNumber", e.target.value)}
                            className={inputClass}
                            placeholder="e.g. 1234567890"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══════ FISCAL YEAR ═══════ */}
          {activeSection === "fiscal" && (
            <SectionCard
              title="Fiscal Year Management"
              description="Configuration, financial summary, and archive management"
            >
              <div className="space-y-5">
                <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
                  {(
                    [
                      { key: "config", label: "Configuration" },
                      { key: "summary", label: "Financial Summary" },
                      { key: "archive", label: "Archive Management" },
                    ] as {
                      key: "config" | "summary" | "archive";
                      label: string;
                    }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFiscalTab(tab.key)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        fiscalTab === tab.key
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {fiscalTab === "config" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Fiscal Year Label</label>
                      <input
                        value={newFiscalYear.label}
                        onChange={(e) =>
                          setNewFiscalYear((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="e.g. FY 2025/2026"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fiscal Cycle</label>
                      <select
                        value={newFiscalYear.cycle}
                        onChange={(e) =>
                          setNewFiscalYear((prev) => ({
                            ...prev,
                            cycle: e.target.value as
                              | "ura_jul_jun"
                              | "calendar_jan_dec"
                              | "custom",
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="ura_jul_jun">URA Cycle (Jul-Jun)</option>
                        <option value="calendar_jan_dec">
                          Calendar Year (Jan-Dec)
                        </option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Start Date</label>
                      <input
                        type="date"
                        value={newFiscalYear.startDate}
                        onChange={(e) =>
                          setNewFiscalYear((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End Date</label>
                      <input
                        type="date"
                        value={newFiscalYear.endDate}
                        onChange={(e) =>
                          setNewFiscalYear((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        id="setActiveYear"
                        type="checkbox"
                        checked={newFiscalYear.setActive}
                        onChange={(e) =>
                          setNewFiscalYear((prev) => ({
                            ...prev,
                            setActive: e.target.checked,
                          }))
                        }
                      />
                      <label
                        htmlFor="setActiveYear"
                        className="text-sm text-gray-600"
                      >
                        Set as active fiscal year after creation
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        onClick={handleCreateFiscalYear}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20"
                      >
                        Create Fiscal Year
                      </button>
                    </div>
                  </div>
                )}

                {fiscalTab === "summary" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={labelClass}>Select Fiscal Year</label>
                      <select
                        value={selectedFiscalYearId}
                        onChange={(e) =>
                          setSelectedFiscalYearId(e.target.value)
                        }
                        className={inputClass + " max-w-xs mt-0"}
                      >
                        {fiscalYears.map((year) => (
                          <option key={year._id} value={year._id}>
                            {year.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: "Total Revenue",
                          value: fiscalSummary?.totalRevenue || 0,
                          color: "text-emerald-700 bg-emerald-50",
                        },
                        {
                          label: "Total Expenses",
                          value: fiscalSummary?.totalExpenses || 0,
                          color: "text-orange-700 bg-orange-50",
                        },
                        {
                          label: "Gross Profit",
                          value: fiscalSummary?.grossProfit || 0,
                          color: "text-blue-700 bg-blue-50",
                        },
                        {
                          label: "Net Profit",
                          value: fiscalSummary?.netProfit || 0,
                          color: "text-purple-700 bg-purple-50",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-xl p-4 ${card.color}`}
                        >
                          <p className="text-[11px] uppercase tracking-wider">
                            {card.label}
                          </p>
                          <p className="mt-2 text-lg font-bold">
                            {formatCurrency(card.value, s.currency)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        Monthly Revenue vs Expenses
                      </p>
                      <div className="space-y-2">
                        {(fiscalSummary?.monthlyRevenueVsExpenses || []).map(
                          (row) => {
                            const max = Math.max(row.revenue, row.expenses, 1);
                            return (
                              <div key={row.month} className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  {row.month}
                                </p>
                                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(row.revenue / max) * 100}%`,
                                    }}
                                  />
                                </div>
                                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-full bg-orange-400"
                                    style={{
                                      width: `${(row.expenses / max) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-2">
                          VAT/Tax Collected
                        </p>
                        <p className="text-xl font-bold text-blue-700">
                          {formatCurrency(
                            fiscalSummary?.vatCollected || 0,
                            s.currency,
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-2">
                          Outstanding Invoices
                        </p>
                        <p className="text-sm text-gray-600">
                          Count: {fiscalSummary?.outstandingInvoices.count || 0}
                        </p>
                        <p className="text-lg font-bold text-amber-700">
                          {formatCurrency(
                            fiscalSummary?.outstandingInvoices.total || 0,
                            s.currency,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {fiscalTab === "archive" && (
                  <div className="space-y-3">
                    {fiscalYears
                      .filter((year) => year.status !== "active")
                      .map((year) => (
                        <div
                          key={year._id}
                          className="rounded-xl border border-gray-100 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {year.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(year.startDate).toLocaleDateString()}{" "}
                                - {new Date(year.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {year.status !== "archived" && (
                                <button
                                  onClick={() =>
                                    runFiscalAction(year._id, "archive")
                                  }
                                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                >
                                  Archive
                                </button>
                              )}
                              {year.status !== "active" && (
                                <button
                                  onClick={() =>
                                    runFiscalAction(year._id, "set-active")
                                  }
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  Set Active
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══════ ARCHIVE ═══════ */}
          {activeSection === "archive" && (
            <SectionCard
              title="Archive Management"
              description="Configure data archiving and retention policies"
            >
              <div className="max-w-lg space-y-1">
                <Toggle
                  checked={s.archiveEnabled}
                  onChange={(v) => upd("archiveEnabled", v)}
                  label="Enable automatic archiving"
                  description="Automatically archive old records after a set period"
                />
                {s.archiveEnabled && (
                  <div className="py-3 border-b border-gray-50">
                    <label className={labelClass}>
                      Auto-archive After (days)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={s.autoArchiveAfterDays}
                      onChange={(e) =>
                        upd(
                          "autoArchiveAfterDays",
                          parseInt(e.target.value) || 365,
                        )
                      }
                      className={inputClass + " max-w-xs"}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Records older than this will be archived
                    </p>
                  </div>
                )}
                <div className="mt-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Archive className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">
                      Archive Status
                    </p>
                  </div>
                  <p className="text-[13px] text-gray-500">
                    {s.archiveEnabled
                      ? `Archiving enabled. Records older than ${s.autoArchiveAfterDays} days will be archived automatically.`
                      : "Archiving is currently disabled. Enable it to automatically archive old records."}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ LEGACY ═══════ */}
          {activeSection === "legacy" && (
            <SectionCard
              title="Legacy Settings"
              description="Configure legacy preferences and operational settings"
            >
              <div className="max-w-lg space-y-4">
                <Toggle
                  checked={s.legacyMode}
                  onChange={(v) => upd("legacyMode", v)}
                  label="Enable legacy mode"
                  description="Use legacy operational workflows and interface patterns"
                />
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Status: {s.legacyMode ? "Configured" : "Not configured"}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-gray-400">Created</p>
                      <p className="text-gray-600">
                        {settingsCreatedAt
                          ? new Date(settingsCreatedAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400">Updated</p>
                      <p className="text-gray-600">
                        {settingsUpdatedAt
                          ? new Date(settingsUpdatedAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══════ USERS ═══════ */}
          {activeSection === "users" && (
            <div className="space-y-6">
              {/* User Settings */}
              <SectionCard
                title="User Settings"
                description="Default user role, email verification, and registration"
              >
                <div className="max-w-lg space-y-4">
                  <div>
                    <label className={labelClass}>Default User Role</label>
                    <select
                      value={s.defaultUserRole}
                      onChange={(e) => upd("defaultUserRole", e.target.value)}
                      className={inputClass + " max-w-xs"}
                    >
                      {allAvailableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role] || getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Toggle
                    checked={s.allowEmailVerify}
                    onChange={(v) => upd("allowEmailVerify", v)}
                    label="Allow email verification"
                    description="Require email verification for new accounts"
                  />
                  <Toggle
                    checked={s.allowSelfRegistration}
                    onChange={(v) => upd("allowSelfRegistration", v)}
                    label="Allow self registration"
                    description="Let users create their own accounts"
                  />
                </div>
              </SectionCard>

              {/* User Management */}
              <SectionCard
                title="User Management"
                description={`${users.length} user${users.length !== 1 ? "s" : ""} in your organization`}
              >
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={() => {
                      setUserError("");
                      setShowUserModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg"
                  >
                    <Plus className="h-4 w-4" /> Add User
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-500" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users className="h-6 w-6 text-gray-300 mb-2" />
                      <p className="font-medium text-gray-500">
                        No users found
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-blue-50/60">
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                            Branch
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                            Joined
                          </th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <tr
                            key={u._id}
                            className="group transition-colors hover:bg-gray-50/60"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-[10px] font-bold text-gray-600">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800">
                                  {u.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {u.email}
                            </td>
                            <td className="px-4 py-3">{roleBadge(u.role)}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {u.branchId?.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-400">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              {u._id !== user?.id && (
                                <button
                                  onClick={() =>
                                    handleDeleteUser(u._id, u.name)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Role Permissions */}
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Role Permissions
                    </p>
                  </div>
                  <div className="space-y-3">
                    {allAvailableRoles.map((role) => (
                      <div
                        key={role}
                        className="rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-700">
                            {ROLE_LABELS[role] || getRoleLabel(role)}
                          </p>
                          {s.customRoles.some((r) => r.key === role) && (
                            <button
                              onClick={() => removeCustomRole(role)}
                              className="text-xs font-semibold text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {MODULE_PERMISSIONS.map((module) => {
                            const enabled =
                              (s.rolePermissions[role] || []).includes(
                                module,
                              ) || role === "admin";
                            return (
                              <button
                                key={`${role}-${module}`}
                                disabled={role === "admin"}
                                onClick={() => togglePermission(role, module)}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${enabled ? "bg-blue-50 text-blue-700 ring-1 ring-blue-700/20" : "bg-gray-100 text-gray-500"} ${role === "admin" ? "opacity-70" : ""}`}
                              >
                                {module.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        className={inputClass + " mt-0"}
                        placeholder="Add custom role (e.g. auditor)"
                      />
                      <button
                        onClick={addCustomRole}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                      >
                        Add Role
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══════ BRANCHES ═══════ */}
          {activeSection === "branches" && (
            <SectionCard
              title="Branches"
              description={`${branches.length} branch${branches.length !== 1 ? "es" : ""}`}
            >
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => openBranchModal()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" /> Add Branch
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {branches.map((b) => (
                  <div
                    key={b._id}
                    className="group rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {b.name}
                          </h3>
                          <p className="font-mono text-[11px] text-gray-400">
                            {b.code}
                          </p>
                        </div>
                      </div>
                      {b.isMain && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-600/20">
                          Main
                        </span>
                      )}
                    </div>
                    {b.address && (
                      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {b.address}
                      </p>
                    )}
                    {b.phone && (
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {b.phone}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2 border-t border-gray-50 pt-2">
                      <button
                        onClick={() => openBranchModal(b)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      {!b.isMain && (
                        <button
                          onClick={() => handleDeleteBranch(b)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {branches.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <Building2 className="h-6 w-6 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No branches yet</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══════ RESET BUTTONS ═══════ */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />{" "}
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ ADD USER MODAL ═══════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    Add New User
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    Create a team member account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={inputClass}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className={inputClass}
                  >
                    {allAvailableRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
                {branches.length > 0 && (
                  <div>
                    <label className={labelClass}>Branch</label>
                    <select
                      value={userBranch}
                      onChange={(e) => setUserBranch(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">No specific branch</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {userError && (
                <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-600/20">
                  {userError}
                </p>
              )}
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={savingUser}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
              >
                {savingUser ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {savingUser ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BRANCH MODAL ═══════ */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    {editingBranch ? "Edit Branch" : "Add Branch"}
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    {editingBranch
                      ? "Update branch details"
                      : "Create a new branch location"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBranchModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass}>Branch Name *</label>
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className={inputClass}
                  placeholder="Main Store"
                />
              </div>
              <div>
                <label className={labelClass}>Branch Code *</label>
                <input
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className={inputClass}
                  placeholder="BR001"
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className={inputClass}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+256 700 000 000"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowBranchModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBranch}
                disabled={savingBranch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50"
              >
                {savingBranch ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                {savingBranch
                  ? "Saving…"
                  : editingBranch
                    ? "Update Branch"
                    : "Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
