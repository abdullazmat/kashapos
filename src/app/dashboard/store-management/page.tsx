"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Users,
  Wallet,
  Save,
  Plus,
  Clock,
  Shield,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { CORE_ROLES, ROLE_LABELS, getRoleLabel } from "@/lib/roles";

type TabKey =
  | "store-profile"
  | "branches-all"
  | "branches-add"
  | "branches-performance"
  | "staff-all"
  | "staff-add"
  | "staff-roles"
  | "staff-shifts"
  | "till-open-close"
  | "till-summary"
  | "till-reconciliation"
  | "settings-hours"
  | "settings-receipt"
  | "settings-loyalty";

interface BranchItem {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface StaffItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branchId?: { _id: string; name: string };
}

interface TillSessionItem {
  _id: string;
  tillName: string;
  cashierName: string;
  openingFloat: number;
  closingCashCount: number;
  expectedCash: number;
  variance: number;
  varianceReason?: string;
  closedAt: string;
}

const tabList: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "store-profile", label: "Store Profile", icon: Building2 },
  { key: "branches-all", label: "All Branches", icon: Building2 },
  { key: "branches-add", label: "Add Branch", icon: Plus },
  {
    key: "branches-performance",
    label: "Branch Performance",
    icon: TrendingUp,
  },
  { key: "staff-all", label: "All Staff", icon: Users },
  { key: "staff-add", label: "Add Staff", icon: Plus },
  { key: "staff-roles", label: "Roles & Permissions", icon: Shield },
  { key: "staff-shifts", label: "Shifts & Attendance", icon: Clock },
  { key: "till-open-close", label: "Open/Close Till", icon: Wallet },
  { key: "till-summary", label: "Till Summary", icon: Calendar },
  { key: "till-reconciliation", label: "Cash Reconciliation", icon: Wallet },
  { key: "settings-hours", label: "Operating Hours", icon: Clock },
  { key: "settings-receipt", label: "Receipt Customization", icon: Save },
  { key: "settings-loyalty", label: "Loyalty & Promotions", icon: TrendingUp },
];

export default function StoreManagementPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") || "store-profile") as TabKey;
  const activeTab = tabList.some((tab) => tab.key === tabParam)
    ? tabParam
    : "store-profile";

  const [storeProfile, setStoreProfile] = useState({
    storeName: "",
    storeLogo: "",
    businessType: "retail",
    tinTaxId: "",
    vatRegistrationNo: "",
    physicalAddress: "",
    district: "",
    country: "Uganda",
    phoneNumber: "",
    emailAddress: "",
    baseCurrency: "UGX",
    receiptFooter: "",
  });

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [tillSessions, setTillSessions] = useState<TillSessionItem[]>([]);

  const [newStaff, setNewStaff] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    nationalId: "",
    role: "cashier",
    assignedBranch: "",
    employmentType: "full_time",
    startDate: "",
    loginPin: "",
    password: "",
    isActive: true,
  });

  const [tillForm, setTillForm] = useState({
    tillName: "Main Till 1",
    openingFloat: "",
    closingCashCount: "",
    varianceReason: "",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, branchesRes, staffRes, tillRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/branches"),
        fetch("/api/users"),
        fetch("/api/tills"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const settings = data.settings || {};
        setStoreProfile((prev) => ({
          ...prev,
          storeName: data.name || "",
          businessType: settings.businessType || "retail",
          tinTaxId: settings.tinTaxId || settings.taxNumber || "",
          vatRegistrationNo: settings.vatRegistrationNo || "",
          physicalAddress: settings.physicalAddress || "",
          district: settings.district || "",
          country: settings.country || "Uganda",
          phoneNumber: settings.phoneNumber || "",
          emailAddress: settings.emailAddress || "",
          baseCurrency: settings.currency || "UGX",
          receiptFooter: settings.receiptFooter || "",
        }));
      }

      if (branchesRes.ok) {
        const data = await branchesRes.json();
        setBranches(Array.isArray(data) ? data : []);
      }

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaff(Array.isArray(data) ? data : []);
      }

      if (tillRes.ok) {
        const data = await tillRes.json();
        setTillSessions(data.sessions || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Defer initial fetch to satisfy strict effect lint rule about sync state updates.
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const activeTabLabel = useMemo(
    () =>
      tabList.find((tab) => tab.key === activeTab)?.label || "Store Profile",
    [activeTab],
  );

  const saveStoreProfile = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: storeProfile.storeName,
          currency: storeProfile.baseCurrency,
          receiptFooter: storeProfile.receiptFooter,
          businessType: storeProfile.businessType,
          tinTaxId: storeProfile.tinTaxId,
          vatRegistrationNo: storeProfile.vatRegistrationNo,
          physicalAddress: storeProfile.physicalAddress,
          district: storeProfile.district,
          country: storeProfile.country,
          phoneNumber: storeProfile.phoneNumber,
          emailAddress: storeProfile.emailAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to save store profile");
      } else {
        setMessage("Store profile saved successfully");
      }
    } catch {
      setMessage("Failed to save store profile");
    }
    setBusy(false);
  };

  const addStaff = async () => {
    if (!newStaff.fullName || !newStaff.email || !newStaff.password) {
      setMessage("Name, email, and password are required");
      return;
    }
    if (newStaff.loginPin && !/^\d{4}$/.test(newStaff.loginPin)) {
      setMessage("Login PIN must be 4 digits");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaff.fullName,
          email: newStaff.email,
          password: newStaff.password,
          role: newStaff.role,
          branchId: newStaff.assignedBranch || undefined,
          phone: newStaff.phoneNumber,
          nationalId: newStaff.nationalId,
          employmentType: newStaff.employmentType,
          startDate: newStaff.startDate || undefined,
          loginPin: newStaff.loginPin || undefined,
          isActive: newStaff.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to add staff member");
      } else {
        setMessage("Staff member added successfully");
        setNewStaff({
          fullName: "",
          phoneNumber: "",
          email: "",
          nationalId: "",
          role: "cashier",
          assignedBranch: "",
          employmentType: "full_time",
          startDate: "",
          loginPin: "",
          password: "",
          isActive: true,
        });
        fetchData();
      }
    } catch {
      setMessage("Failed to add staff member");
    }
    setBusy(false);
  };

  const closeTill = async () => {
    if (!tillForm.tillName) {
      setMessage("Till name is required");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/tills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tillName: tillForm.tillName,
          openingFloat: Number(tillForm.openingFloat || 0),
          closingCashCount: Number(tillForm.closingCashCount || 0),
          varianceReason: tillForm.varianceReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to close till");
      } else {
        setMessage("Till closed and reconciled successfully");
        setTillForm((prev) => ({
          ...prev,
          openingFloat: "",
          closingCashCount: "",
          varianceReason: "",
        }));
        fetchData();
      }
    } catch {
      setMessage("Failed to close till");
    }
    setBusy(false);
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-sm text-gray-500">
            Configuration and operational setup under SYSTEM
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-2">
        {tabList.map((tab) => (
          <a
            key={tab.key}
            href={`/dashboard/store-management?tab=${tab.key}`}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-orange-50 text-orange-700"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800">{activeTabLabel}</h2>
        {message && (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {message}
          </p>
        )}

        {activeTab === "store-profile" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Store Name
              </label>
              <input
                value={storeProfile.storeName}
                onChange={(e) =>
                  setStoreProfile((p) => ({ ...p, storeName: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Business Type
              </label>
              <select
                value={storeProfile.businessType}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    businessType: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="restaurant">Restaurant</option>
                <option value="retail">Retail</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="supermarket">Supermarket</option>
                <option value="bakery">Bakery</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                TIN (Tax ID)
              </label>
              <input
                value={storeProfile.tinTaxId}
                onChange={(e) =>
                  setStoreProfile((p) => ({ ...p, tinTaxId: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                VAT Registration No.
              </label>
              <input
                value={storeProfile.vatRegistrationNo}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    vatRegistrationNo: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Physical Address
              </label>
              <textarea
                value={storeProfile.physicalAddress}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    physicalAddress: e.target.value,
                  }))
                }
                rows={2}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                District
              </label>
              <input
                value={storeProfile.district}
                onChange={(e) =>
                  setStoreProfile((p) => ({ ...p, district: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Country
              </label>
              <input
                value={storeProfile.country}
                onChange={(e) =>
                  setStoreProfile((p) => ({ ...p, country: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Phone Number
              </label>
              <input
                value={storeProfile.phoneNumber}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    phoneNumber: e.target.value,
                  }))
                }
                className={inputClass}
                placeholder="+256XXXXXXXXX"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Email Address
              </label>
              <input
                type="email"
                value={storeProfile.emailAddress}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    emailAddress: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Base Currency
              </label>
              <select
                value={storeProfile.baseCurrency}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    baseCurrency: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="UGX">UGX</option>
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Receipt Footer
              </label>
              <textarea
                value={storeProfile.receiptFooter}
                onChange={(e) =>
                  setStoreProfile((p) => ({
                    ...p,
                    receiptFooter: e.target.value,
                  }))
                }
                rows={2}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={saveStoreProfile}
                disabled={busy}
                className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save Store Profile
              </button>
            </div>
          </div>
        )}

        {activeTab === "staff-add" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Full Name
              </label>
              <input
                value={newStaff.fullName}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, fullName: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Phone Number
              </label>
              <input
                value={newStaff.phoneNumber}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, phoneNumber: e.target.value }))
                }
                className={inputClass}
                placeholder="+256XXXXXXXXX"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Email
              </label>
              <input
                type="email"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, email: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                National ID (NIN)
              </label>
              <input
                value={newStaff.nationalId}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, nationalId: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Role
              </label>
              <select
                value={newStaff.role}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, role: e.target.value }))
                }
                className={inputClass}
              >
                {CORE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role] || getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Assigned Branch
              </label>
              <select
                value={newStaff.assignedBranch}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, assignedBranch: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Employment Type
              </label>
              <select
                value={newStaff.employmentType}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, employmentType: e.target.value }))
                }
                className={inputClass}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Start Date
              </label>
              <input
                type="date"
                value={newStaff.startDate}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, startDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Login PIN
              </label>
              <input
                value={newStaff.loginPin}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, loginPin: e.target.value }))
                }
                className={inputClass}
                placeholder="4 digits"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Password
              </label>
              <input
                type="password"
                value={newStaff.password}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, password: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={addStaff}
                disabled={busy}
                className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add Staff
              </button>
            </div>
          </div>
        )}

        {activeTab === "till-open-close" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Till Name
              </label>
              <input
                value={tillForm.tillName}
                onChange={(e) =>
                  setTillForm((p) => ({ ...p, tillName: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Opening Float
              </label>
              <input
                type="number"
                value={tillForm.openingFloat}
                onChange={(e) =>
                  setTillForm((p) => ({ ...p, openingFloat: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Closing Cash Count
              </label>
              <input
                type="number"
                value={tillForm.closingCashCount}
                onChange={(e) =>
                  setTillForm((p) => ({
                    ...p,
                    closingCashCount: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Variance Reason
              </label>
              <textarea
                value={tillForm.varianceReason}
                onChange={(e) =>
                  setTillForm((p) => ({ ...p, varianceReason: e.target.value }))
                }
                rows={2}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={closeTill}
                disabled={busy}
                className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Close Till
              </button>
            </div>
          </div>
        )}

        {(activeTab === "staff-all" ||
          activeTab === "staff-roles" ||
          activeTab === "staff-shifts") && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Branch</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member._id} className="border-b">
                    <td className="px-3 py-2">{member.name}</td>
                    <td className="px-3 py-2">{member.email}</td>
                    <td className="px-3 py-2 capitalize">{member.role}</td>
                    <td className="px-3 py-2">
                      {member.branchId?.name || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {member.isActive ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(activeTab === "branches-all" ||
          activeTab === "branches-performance") && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left">Branch</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch._id} className="border-b">
                    <td className="px-3 py-2">{branch.name}</td>
                    <td className="px-3 py-2">{branch.code}</td>
                    <td className="px-3 py-2">
                      {branch.isActive ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(activeTab === "till-summary" ||
          activeTab === "till-reconciliation") && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left">Till</th>
                  <th className="px-3 py-2 text-left">Cashier</th>
                  <th className="px-3 py-2 text-right">Expected Cash</th>
                  <th className="px-3 py-2 text-right">Closing Count</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                  <th className="px-3 py-2 text-left">Closed At</th>
                </tr>
              </thead>
              <tbody>
                {tillSessions.map((session) => (
                  <tr key={session._id} className="border-b">
                    <td className="px-3 py-2">{session.tillName}</td>
                    <td className="px-3 py-2">{session.cashierName}</td>
                    <td className="px-3 py-2 text-right">
                      {session.expectedCash.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {session.closingCashCount.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${session.variance === 0 ? "text-emerald-600" : session.variance > 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {session.variance.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(session.closedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(activeTab === "branches-add" ||
          activeTab === "settings-hours" ||
          activeTab === "settings-receipt" ||
          activeTab === "settings-loyalty") && (
          <p className="mt-5 text-sm text-gray-500">
            Use the existing Branches and Settings modules for this action. The
            navigation is now grouped under Store Management in SYSTEM.
          </p>
        )}
      </div>
    </div>
  );
}
