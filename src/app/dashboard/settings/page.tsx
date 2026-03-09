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

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export default function SettingsPage() {
  const { user, tenant } = useSession();
  const [activeTab, setActiveTab] = useState<"general" | "users" | "branches">(
    "general",
  );

  // General settings
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [taxRate, setTaxRate] = useState("0");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.name || "");
      setCurrency(tenant.settings?.currency || "UGX");
      setTaxRate(String(tenant.settings?.taxRate || 0));
      setReceiptHeader(tenant.settings?.receiptHeader || "");
      setReceiptFooter(tenant.settings?.receiptFooter || "");
      setLowStockThreshold(String(tenant.settings?.lowStockThreshold || 10));
    }
  }, [tenant]);

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

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          currency,
          taxRate: parseFloat(taxRate) || 0,
          receiptHeader,
          receiptFooter,
          lowStockThreshold: parseInt(lowStockThreshold) || 10,
        }),
      });
      if (res.ok) {
        setSettingsMsg({
          type: "success",
          text: "Settings saved successfully!",
        });
        window.location.reload();
      } else {
        const data = await res.json();
        setSettingsMsg({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setSettingsMsg({ type: "error", text: "Network error" });
    }
    setSavingSettings(false);
  };

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
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Network error");
    }
  };

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
      const res = await fetch(`/api/branches?id=${branch._id}`, {
        method: "DELETE",
      });
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
      cashier: "bg-emerald-50 text-emerald-600 ring-emerald-600/20",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${colors[role] || "bg-gray-50 text-gray-600 ring-gray-600/20"}`}
      >
        {role}
      </span>
    );
  };

  const tabs = [
    { key: "general" as const, label: "General", icon: Settings },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "branches" as const, label: "Branches", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-slate-800 shadow-lg shadow-gray-700/20">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
          <p className="text-[13px] text-gray-400">
            Manage your business configuration
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100/80 p-1.5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ════════════ GENERAL TAB ════════════ */}
      {activeTab === "general" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-base font-bold text-gray-800">
            Business Settings
          </h3>
          <div className="max-w-lg space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Alert when stock falls below this level
              </p>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Receipt Header
              </label>
              <textarea
                rows={2}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className={inputClass}
                placeholder="Text printed at the top of receipts"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Receipt Footer
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className={inputClass}
                placeholder="e.g. Thank you for your purchase!"
              />
            </div>

            {settingsMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${settingsMsg.type === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-red-50 text-red-700 ring-1 ring-red-600/20"}`}
              >
                {settingsMsg.type === "success" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {settingsMsg.text}
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all hover:shadow-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ════════════ USERS TAB ════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">
              {users.length} user{users.length !== 1 ? "s" : ""} in your
              organization
            </p>
            <button
              onClick={() => {
                setUserError("");
                setShowUserModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all hover:shadow-lg"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-teal-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                  <Users className="h-6 w-6 text-gray-300" />
                </div>
                <p className="font-medium text-gray-500">No users found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Email
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Branch
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Joined
                    </th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className="group transition-colors hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-[11px] font-bold text-gray-600">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-800">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3.5">{roleBadge(u.role)}</td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {u.branchId?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {u._id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
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
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Role Permissions
              </p>
            </div>
            <ul className="space-y-1.5 text-[13px] text-gray-500">
              <li>
                • <strong className="text-gray-700">Admin</strong> — Full access
                to all features and settings
              </li>
              <li>
                • <strong className="text-gray-700">Manager</strong> — Manage
                inventory, sales, purchases, reports
              </li>
              <li>
                • <strong className="text-gray-700">Cashier</strong> — POS
                terminal and basic sales operations
              </li>
            </ul>
          </div>

          {/* Add User Modal */}
          {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Full Name *
                    </label>
                    <input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className={inputClass}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className={inputClass}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Password *
                    </label>
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
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Role
                      </label>
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
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Branch
                        </label>
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
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUser}
                    disabled={savingUser}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all hover:shadow-lg disabled:opacity-50"
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
        </div>
      )}

      {/* ════════════ BRANCHES TAB ════════════ */}
      {activeTab === "branches" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">
              {branches.length} branch{branches.length !== 1 ? "es" : ""}
            </p>
            <button
              onClick={() => openBranchModal()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all hover:shadow-lg"
            >
              <Plus className="h-4 w-4" /> Add Branch
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div
                key={b._id}
                className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{b.name}</h3>
                      <p className="font-mono text-[11px] text-gray-400">
                        {b.code}
                      </p>
                    </div>
                  </div>
                  {b.isMain && (
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 ring-1 ring-teal-600/20">
                      Main
                    </span>
                  )}
                </div>
                {b.address && (
                  <p className="mt-3 flex items-center gap-1.5 text-[13px] text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {b.address}
                  </p>
                )}
                {b.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-gray-500">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {b.phone}
                  </p>
                )}
                <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => openBranchModal(b)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </button>
                  {!b.isMain && (
                    <button
                      onClick={() => handleDeleteBranch(b)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                  <Building2 className="h-6 w-6 text-gray-300" />
                </div>
                <p className="font-medium text-gray-500">No branches yet</p>
                <p className="text-[13px] text-gray-400">
                  Add your first branch to get started
                </p>
              </div>
            )}
          </div>

          {/* Branch Modal */}
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Branch Name *
                    </label>
                    <input
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className={inputClass}
                      placeholder="Main Store"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Branch Code *
                    </label>
                    <input
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className={inputClass}
                      placeholder="BR001"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Address
                    </label>
                    <input
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      className={inputClass}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Phone
                    </label>
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
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBranch}
                    disabled={savingBranch}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg disabled:opacity-50"
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
      )}
    </div>
  );
}
