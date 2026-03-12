"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useSession } from "@/app/dashboard/layout";

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

type SettingsSection =
  | "general"
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
  });

  const [settingsCreatedAt, setSettingsCreatedAt] = useState("");
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState("");

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
    });
  };

  const upd = (field: string, value: unknown) =>
    setS((prev) => ({ ...prev, [field]: value }));

  const handleThemeSelect = (theme: "light" | "dark") => {
    upd("theme", theme);
    applyThemeSetting(theme);
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
      manager: "bg-blue-50 text-blue-600 ring-blue-600/20",
      cashier: "bg-emerald-50 text-amber-600 ring-amber-600/20",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${colors[role] || "bg-gray-50 text-gray-600 ring-gray-600/20"}`}
      >
        {role}
      </span>
    );
  };

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
              description="Configure your business currency"
            >
              <div className="max-w-lg space-y-4">
                <div>
                  <label className={labelClass}>Primary Currency</label>
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
                  <p className="mt-2 text-sm text-gray-500">
                    Preview:{" "}
                    {new Intl.NumberFormat("en", {
                      style: "currency",
                      currency: s.currency,
                      minimumFractionDigits: 0,
                    }).format(1000)}
                  </p>
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
              description="Configure your organization's fiscal year periods"
            >
              <div className="max-w-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Fiscal Year Start (MM-DD)
                    </label>
                    <input
                      type="text"
                      value={s.fiscalYearStart}
                      onChange={(e) => upd("fiscalYearStart", e.target.value)}
                      className={inputClass}
                      placeholder="01-01"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Format: MM-DD (e.g. 01-01 for January 1st)
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Fiscal Year End (MM-DD)
                    </label>
                    <input
                      type="text"
                      value={s.fiscalYearEnd}
                      onChange={(e) => upd("fiscalYearEnd", e.target.value)}
                      className={inputClass}
                      placeholder="12-31"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Format: MM-DD (e.g. 12-31 for December 31st)
                    </p>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Current Fiscal Year</label>
                  <input
                    type="text"
                    value={s.currentFiscalYear}
                    onChange={(e) => upd("currentFiscalYear", e.target.value)}
                    className={inputClass + " max-w-xs"}
                    placeholder="e.g. 2025/2026"
                  />
                </div>
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-700">
                      Fiscal Year Summary
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-blue-500">Start Date</p>
                      <p className="font-medium text-blue-800">
                        {s.fiscalYearStart || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-500">End Date</p>
                      <p className="font-medium text-blue-800">
                        {s.fiscalYearEnd || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-500">Current Year</p>
                      <p className="font-medium text-blue-800">
                        {s.currentFiscalYear || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-500">Status</p>
                      <p className="font-medium text-emerald-700">Active</p>
                    </div>
                  </div>
                </div>
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
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
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
                  <ul className="space-y-1 text-[13px] text-gray-500">
                    <li>
                      • <strong className="text-gray-700">Admin</strong> — Full
                      access to all features and settings
                    </li>
                    <li>
                      • <strong className="text-gray-700">Manager</strong> —
                      Manage inventory, sales, purchases, reports
                    </li>
                    <li>
                      • <strong className="text-gray-700">Cashier</strong> — POS
                      terminal and basic sales operations
                    </li>
                  </ul>
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
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
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
