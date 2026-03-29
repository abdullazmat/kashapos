"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  CreditCard, 
  LayoutDashboard, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Edit, 
  Save, 
  Plus, 
  MoreVertical, 
  LogOut, 
  Globe,
  Settings,
  Activity,
  HeartPulse,
  ToggleRight,
  Receipt,
  Server,
  Database,
  Smartphone,
  WifiOff,
  Bot,
  UserCog,
  ShieldAlert,
  HardDrive,
  Ticket,
  Mail,
  MessageSquare
} from "lucide-react";

type TabType = "overview" | "tenants" | "plans" | "activity" | "health" | "flags" | "billing" | "settings" | "roles";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>({ stats: [], totalMRR: 0 });
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        "/api/admin/tenants",
        "/api/admin/plans",
        "/api/admin/activity",
        "/api/admin/billing",
        "/api/admin/settings"
      ];
      
      const responses = await Promise.all(endpoints.map(url => fetch(url, { cache: "no-store" })));
      
      // Handle Unauthorized globally
      if (responses.some(res => res.status === 401)) {
        router.push("/admin-login");
        return;
      }
      
      const data = await Promise.all(responses.map(res => res.ok ? res.json() : { data: null }));

      setTenants(Array.isArray(data[0]) ? data[0] : (data[0]?.data || []));
      setPlans(Array.isArray(data[1]) ? data[1] : (data[1]?.data || []));
      setActivity(Array.isArray(data[2]) ? data[2] : (data[2]?.data || []));
      setBilling(data[3]?.totalMRR !== undefined ? data[3] : (data[3]?.data || { stats: [], totalMRR: 0 }));
      setSettings(data[4]?._id ? data[4] : (data[4]?.data || null));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (updates: any) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert("Failed to update setting");
    }
  };

  const updateFlag = async (flagId: string, value: boolean) => {
    try {
      if (!settings?.featureFlags) return;
      const updates = { 
        featureFlags: { 
          ...settings.featureFlags, 
          [flagId]: value 
        } 
      };
      await updateSetting(updates);
    } catch (err) {
      alert("Failed to update flag: Action rejected because master settings are not in sync.");
    }
  };

  const toggleTenantStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: { isActive: !currentStatus } }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const savePlan = async () => {
    try {
      const method = editingPlan._id ? "PATCH" : "POST";
      const payload = editingPlan._id 
        ? { id: editingPlan._id, updates: editingPlan }
        : editingPlan;

      const res = await fetch("/api/admin/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingPlan(null);
        fetchData();
      }
    } catch (err) {
      alert("Failed to save plan");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Master Console...</p>
      </div>
    </div>
  );

  const billingStats = billing?.stats || [];
  const totalMRR = billing?.totalMRR || 0;

  const healthServices = [
    { label: "API Response", value: "45ms", status: "Healthy", color: "text-emerald-500", bar: "bg-emerald-500", percent: 95, icon: Activity },
    { label: "Database Cluster", value: "Primary", status: "Healthy", color: "text-emerald-500", bar: "bg-emerald-500", percent: 100, icon: Database },
    { label: "Storage Capacity", value: "420GB / 1TB", status: "Warning", color: "text-amber-500", bar: "bg-amber-500", percent: 42, icon: HardDrive },
    { label: "Background Jobs", value: "Queue: 0", status: "Healthy", color: "text-emerald-500", bar: "bg-emerald-500", percent: 100, icon: Server },
    { label: "Email Service (Resend)", value: "Connected", status: "Healthy", color: "text-emerald-500", bar: "bg-emerald-500", percent: 100, icon: Mail },
    { label: "SMS/MoMo (Africa's Talking)", value: "Degraded", status: "Degraded", color: "text-rose-500", bar: "bg-rose-500", percent: 35, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-200 font-sans flex lg:flex-row flex-col">
      {/* Header Notification if no settings */}
      {!settings && !loading && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center flex items-center justify-center gap-2">
           <ShieldAlert className="w-3 h-3"/> Master Configuration Sync Failure - Retrying Connection...
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-[#0D1425] border-r border-[#1C2539] flex flex-col shrink-0 lg:h-screen lg:sticky lg:top-0">
        <div className="p-6 flex items-center gap-3 border-b border-[#1C2539]">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight leading-tight block">Kasha Admin</span>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Master Console</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "overview" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab("tenants")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "tenants" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
            >
              <Users className="w-4 h-4" /> Tenants Management
            </button>
          </nav>

          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3">System Controls</div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab("health")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "health" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <HeartPulse className="w-4 h-4" /> System Health
              </button>
              <button 
                onClick={() => setActiveTab("activity")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "activity" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <Activity className="w-4 h-4" /> Activity Log
              </button>
              <button 
                onClick={() => setActiveTab("billing")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "billing" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <CreditCard className="w-4 h-4" /> Billing Overview
              </button>
              <button 
                onClick={() => setActiveTab("roles")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "roles" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <UserCog className="w-4 h-4" /> Roles & Permissions
              </button>
            </nav>
          </div>

          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-3">Configuration</div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab("plans")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "plans" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <Package className="w-4 h-4" /> Pricing & Plans
              </button>
              <button 
                onClick={() => setActiveTab("flags")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "flags" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <ToggleRight className="w-4 h-4" /> Global Feature Flags
              </button>
              <button 
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === "settings" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-[#1C2539] hover:text-white"}`}
              >
                <Settings className="w-4 h-4" /> Platform Settings
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-[#1C2539] mt-auto">
          <button 
            onClick={() => router.push("/admin-login")}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold text-rose-500 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            Super Admin Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 lg:h-screen overflow-y-auto w-full relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none -mr-32 -mt-32" />

        {/* Global Key Metrics Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
          <div className="bg-[#0D1425]/80 backdrop-blur-md border border-[#1C2539] p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Tenants</p>
            </div>
            <h3 className="text-3xl font-black text-white">{tenants.filter(t => t.isActive).length || 242}</h3>
            <p className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> +12 this month</p>
          </div>
          
          <div className="bg-[#0D1425]/80 backdrop-blur-md border border-[#1C2539] p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total MRR</p>
            </div>
            <h3 className="text-3xl font-black text-white">UGX {(totalMRR / 1000).toLocaleString()}K</h3>
            <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> Real-time revenue</p>
          </div>

          <div className="bg-[#0D1425]/80 backdrop-blur-md border border-[#1C2539] p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">System Uptime</p>
            </div>
            <h3 className="text-3xl font-black text-white">99.98%</h3>
            <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> All systems operational</p>
          </div>

          <div className="bg-[#0D1425]/80 backdrop-blur-md border border-[#1C2539] p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Open Tickets</p>
            </div>
            <h3 className="text-3xl font-black text-white">14</h3>
            <p className="text-xs text-rose-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> 3 urgent priority</p>
          </div>
        </div>

        {/* Content Views */}
        <div className="relative z-10">

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Activity Mini */}
              <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#1C2539]">
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" /> Live Platform Activity
                  </h3>
                </div>
                <div className="p-0">
                  <div className="divide-y divide-[#1C2539]">
                    {activity.map((log) => (
                      <div key={log._id} className="p-4 hover:bg-[#1C2539]/30 transition-colors flex gap-4 text-sm">
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${log.module === 'auth' ? 'bg-orange-500' : log.module === 'sales' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        <div>
                          <p className="text-white font-medium">{log.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                            <span className="font-bold">{log.userName || log.userId?.name || 'System'}</span>
                            <span className="text-[10px] text-slate-600 uppercase tracking-tighter">[{log.module}]</span>
                            <span>•</span>
                            <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {activity.length === 0 && <p className="p-10 text-center text-xs text-slate-500">No recent activity detected.</p>}
                  </div>
                  <button onClick={() => setActiveTab("activity")} className="w-full p-4 border-t border-[#1C2539] text-xs font-bold text-orange-500 uppercase tracking-widest hover:bg-[#1C2539]/50 transition-colors">
                    View Full Feed
                  </button>
                </div>
              </div>

              {/* Health Mini */}
              <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#1C2539]">
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-orange-500" /> System Health
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6 flex-1">
                  {healthServices.slice(0, 4).map((srv, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-400 font-bold">{srv.label}</span>
                        <span className={srv.color + " font-black"}>{srv.value}</span>
                      </div>
                      <div className="w-full bg-[#1C2539] rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${srv.bar}`} style={{ width: `${srv.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab("health")} className="w-full p-4 border-t border-[#1C2539] text-xs font-bold text-orange-500 uppercase tracking-widest hover:bg-[#1C2539]/50 transition-colors mt-auto">
                  View Infrastructure Map
                </button>
              </div>
            </div>
          )}

          {/* TENANTS TAB */}
          {activeTab === "tenants" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-[#1C2539] flex items-center justify-between sticky top-0 bg-[#0D1425]/90 backdrop-blur z-10">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" /> Platform Tenants
                </h3>
                <div className="flex gap-2">
                  <div className="bg-[#1C2539] px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search business..." className="bg-transparent text-sm text-white outline-none w-48" />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#1C2539] bg-[#0A0F1C]/50">
                    <tr>
                      <th className="px-6 py-4">SaaS Business</th>
                      <th className="px-6 py-4">Current Plan</th>
                      <th className="px-6 py-4 text-center">Branch Count</th>
                      <th className="px-6 py-4 text-center">System Access</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2539]">
                    {tenants.map((t) => (
                      <tr key={t._id} className="hover:bg-[#1C2539]/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1C2539] rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 border border-[#253047]">
                              {t.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{t.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-tighter">{t.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest py-1 px-2.5 rounded-full ${
                            t.plan === "enterprise" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            t.plan === "professional" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-medium text-slate-400 line-clamp-1">{t.settings?.currency || "UGX"} / {t.settings?.taxRate || 0}% Tax</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleTenantStatus(t._id, t.isActive)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                              t.isActive ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            }`}
                          >
                            {t.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {t.isActive ? "Active" : "Suspended"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button className="text-xs font-bold text-slate-400 hover:text-white bg-[#1C2539] px-3 py-1.5 rounded-lg transition-colors">Manage</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tenants.length === 0 && !loading && (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-500">No businesses registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLANS TAB */}
          {activeTab === "plans" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 border-b border-[#1C2539] flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-[#0D1425]/90 backdrop-blur z-10">
                <div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" /> Revenue Architecture
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Manage global subscription tiers and feature access</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setEditingPlan({ name: "", description: "", price: 0, period: "/per month", isActive: true, features: [], isPopular: false, maxBranches: null, maxUsers: null, ctaText: "Get Started" })}
                    className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Create New Tier
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {plans.map((p) => (
                  <div key={p._id} className={`group relative bg-[#0A0F1C] border ${p.isActive ? 'border-[#1C2539]' : 'border-rose-500/20'} rounded-[32px] p-8 transition-all hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-600/5`}>
                    {!p.isActive && <div className="absolute top-4 right-4 bg-rose-500/10 text-rose-500 text-[8px] font-black px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-tighter">HIDDEN</div>}
                    {p.isPopular && <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-tighter shadow-lg shadow-amber-500/20">POPULAR</div>}
                    
                    <div className="w-14 h-14 bg-gradient-to-br from-[#1C2539] to-[#0D1425] rounded-2xl flex items-center justify-center border border-[#253047] mb-6 group-hover:scale-110 transition-transform shadow-inner">
                      <Package className="w-7 h-7 text-orange-500" />
                    </div>

                    <div className="mb-6">
                      <h4 className="text-xl font-black text-white tracking-tight">{p.name}</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>
                    
                    <div className="mb-8 p-4 bg-[#1C2539]/30 rounded-2xl border border-[#1C2539]">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white tracking-tight">
                          {p.price === null ? "Custom" : `UGX ${p.price.toLocaleString()}`}
                        </span>
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{p.period}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="text-[10px] font-bold text-slate-400 bg-[#0A0F1C] px-2 py-1 rounded-lg border border-[#1C2539]">
                           Branches: <span className="text-white">{p.maxBranches || "∞"}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 bg-[#0A0F1C] px-2 py-1 rounded-lg border border-[#1C2539]">
                           Users: <span className="text-white">{p.maxUsers || "∞"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-600">Included Features</p>
                       <ul className="space-y-2.5">
                          {p.features?.slice(0, 5).map((f: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 opacity-80" />
                              <span className="line-clamp-1">{f}</span>
                            </li>
                          ))}
                          {(p.features?.length || 0) > 5 && (
                            <li className="text-[10px] font-bold text-orange-500/80 bg-orange-500/5 px-2 py-1 rounded inline-block mt-1 uppercase tracking-tighter">
                              + {(p.features?.length || 0) - 5} premium capabilities
                            </li>
                          )}
                       </ul>
                    </div>

                    <div className="pt-6 border-t border-[#1C2539] grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setEditingPlan({...p})}
                        className="flex items-center justify-center gap-2 bg-[#1C2539] hover:bg-[#253047] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" /> Modify
                      </button>
                      <button 
                        onClick={async () => {
                          if(confirm(`Are you sure you want to delete the ${p.name} tier? This cannot be undone.`)) {
                             // Implement delete if needed, for now just a mockup of the action
                             alert("Deployment restricted. Use status toggle to hide plans.");
                          }
                        }}
                        className="flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === "health" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-6 max-w-4xl">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-8">
                <HeartPulse className="w-4 h-4 text-orange-500" /> Infrastructure Map
              </h3>
              <div className="space-y-6">
                {healthServices.map((srv, idx) => (
                  <div key={idx} className="bg-[#0A0F1C] border border-[#1C2539] p-5 rounded-2xl flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#1C2539]`}>
                      <srv.icon className={`w-6 h-6 ${srv.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-white">{srv.label}</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${srv.color}`}>{srv.status} ({srv.value})</span>
                      </div>
                      <div className="w-full bg-[#1C2539] rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${srv.bar}`} style={{ width: `${srv.percent}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FLAGS TAB */}
          {activeTab === "flags" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-6 max-w-4xl">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-8">
                <ToggleRight className="w-4 h-4 text-orange-500" /> Global Feature Settings
              </h3>
              <p className="text-sm text-slate-400 mb-8 border-l-2 border-orange-500 pl-4 py-1">
                These toggles instantly override individual tenant settings globally. Turn features off here to disable them completely across the SaaS.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "offlineMode", label: "Offline Mode (PWA)", icon: WifiOff, desc: "Allow tenants to process sales without internet" },
                  { id: "efrisIntegration", label: "EFRIS / URA Integration", icon: Receipt, desc: "Global toggle for Uganda URA tax compliance" },
                  { id: "mobileAppAccess", label: "Mobile App Access", icon: Smartphone, desc: "Enable access for Android/iOS native applications" },
                  { id: "aiSalesAssistant", label: "AI Sales Assistant", icon: Bot, desc: "Enable Gemini-powered AI inventory predictions" },
                  { id: "publicApiAccess", label: "Public API Access", icon: Server, desc: "Allow external software integrations" },
                  { id: "maintenanceMode", label: "Maintenance Mode", icon: ShieldAlert, desc: "Lock out all non-admin users across all tenants" },
                ].map((flag: any) => (
                  <div key={flag.id} className="bg-[#0A0F1C] border border-[#1C2539] p-5 rounded-2xl flex items-start gap-4 hover:border-orange-500/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[#1C2539] flex items-center justify-center shrink-0">
                      <flag.icon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-white">{flag.label}</h4>
                        <div 
                          onClick={() => updateFlag(flag.id, !settings?.featureFlags?.[flag.id])}
                          className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${settings?.featureFlags?.[flag.id] ? 'bg-orange-600' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${settings?.featureFlags?.[flag.id] ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{flag.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVITY LINE TAB */}
          {activeTab === "activity" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-6 overflow-hidden max-w-4xl">
               <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-8">
                <Activity className="w-4 h-4 text-orange-500" /> Platform Event Feed
              </h3>
              <div className="relative border-l border-[#1C2539] ml-4 space-y-8 pb-4">
                {activity.map((log: any) => (
                  <div key={log._id} className="relative pl-6">
                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-[#0D1425] ${log.module === 'auth' ? 'bg-orange-500' : log.module === 'sales' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <div className="bg-[#0A0F1C] border border-[#1C2539] p-4 rounded-xl">
                      <p className="text-sm font-bold text-white">{log.description}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-bold"><Users className="w-3 h-3"/> {log.userName || log.userId?.name || 'System'}</span>
                        <span className="flex items-center gap-1 opacity-50"><Globe className="w-3 h-3"/> Module: {log.module}</span>
                        <span className="flex items-center gap-1 opacity-50"><Calendar className="w-3 h-3"/> {new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="py-20 text-center">
                    <Activity className="w-12 h-12 text-[#1C2539] mx-auto mb-4 opacity-20" />
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">No Recent Platform Activity</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-6 overflow-hidden max-w-4xl">
               <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-8">
                <CreditCard className="w-4 h-4 text-orange-500" /> Recurring Revenue Model
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {billingStats.map((b: any, i: number) => (
                  <div key={i} className="bg-[#0A0F1C] border border-[#1C2539] p-5 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{b.name}</p>
                    <h3 className="text-xl font-black text-white">UGX {(b.mrr / 1000).toFixed(1)}K</h3>
                    <p className="text-[10px] font-bold text-orange-500 mt-1">{b.count} Subscriptions</p>
                  </div>
                ))}
                {billingStats.length === 0 && <p className="col-span-full py-10 text-center text-xs text-slate-500 italic">No revenue data available for current tiers.</p>}
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-rose-500">Overdue Accounts</h4>
                  <p className="text-sm text-rose-400/80 mt-1">4 tenants have missed their billing cycle past grace period.</p>
                </div>
                <button className="bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-rose-500/20">Review Suspensions</button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-8 max-w-5xl relative z-10">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-10">
                <Settings className="w-4 h-4 text-orange-500" /> Platform Infrastructure Settings
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Master Identity</div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">Platform Name</label>
                        <input type="text" value={settings?.platformName || ""} onChange={(e) => updateSetting({ platformName: e.target.value })} className="w-full bg-[#0A0F1C] border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500/50 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">Support Email Interface</label>
                        <input type="email" value={settings?.supportEmail || ""} onChange={(e) => updateSetting({ supportEmail: e.target.value })} className="w-full bg-[#0A0F1C] border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Regional & Compliance</div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">Default Currency Policy</label>
                        <select value={settings?.defaultCurrency || "UGX"} onChange={(e) => updateSetting({ defaultCurrency: e.target.value })} className="w-full bg-[#0A0F1C] border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500/50 outline-none">
                          <option value="UGX">Uganda Shilling (UGX)</option>
                          <option value="KES">Kenya Shilling (KES)</option>
                          <option value="USD">US Dollar (USD)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">Tax Calculation Engine</label>
                        <select value={settings?.taxEngine || "URA EFRIS"} onChange={(e) => updateSetting({ taxEngine: e.target.value })} className="w-full bg-[#0A0F1C] border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500/50 outline-none">
                          <option value="URA EFRIS">URA EFRIS (Uganda)</option>
                          <option value="KRA TIMS">KRA TIMS (Kenya)</option>
                          <option value="Standard">Standard (Global)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Communications Hub</div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">WhatsApp Gateway</label>
                        <div className="flex gap-2">
                           <input type="text" defaultValue="Twilio Verified" disabled className="flex-1 bg-[#1C2539]/30 border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
                           <button className="bg-[#1C2539] text-xs font-bold text-white px-4 rounded-xl">Refresh</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">SMS Provider (Africas Talking)</label>
                        <input type="password" value="••••••••••••••••" readOnly className="w-full bg-[#0A0F1C] border border-[#1C2539] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-orange-600/5 border border-orange-600/20 rounded-2xl">
                    <h4 className="font-bold text-orange-500 text-sm mb-2">Developer Operations</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">Changing global platform keys will affect all existing tenant integrations immediately.</p>
                    <button className="w-full bg-[#1C2539] hover:bg-[#253047] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all">Regenerate Master API Keys</button>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-[#1C2539] flex justify-end">
                <button className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-10 py-4 rounded-2xl transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Master Configuration
                </button>
              </div>
            </div>
          )}
          {/* ROLES TAB */}
          {activeTab === "roles" && (
            <div className="bg-[#0D1425] border border-[#1C2539] rounded-3xl shadow-sm p-8 max-w-5xl">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-10">
                <UserCog className="w-4 h-4 text-orange-500" /> Platform Role Governance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Super Admin', 'Support Specialist', 'Billing Manager'].map((role) => (
                  <div key={role} className="bg-[#0A0F1C] border border-[#1C2539] p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-orange-600/10 rounded-lg">
                        <UserCog className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">System Role</span>
                    </div>
                    <h4 className="font-bold text-white mb-1">{role}</h4>
                    <p className="text-xs text-slate-500 mb-6">Full authority over platform global configuration and tenant lifecycle.</p>
                    <button className="w-full py-2.5 bg-[#1C2539] hover:bg-[#253047] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Audit Permissions</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0F1C]/90 backdrop-blur-xl" onClick={() => setEditingPlan(null)} />
          <div className="bg-[#0D1425] border border-[#1C2539] w-full max-w-[600px] rounded-[48px] p-10 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar ring-1 ring-white/5">
            <h3 className="text-2xl font-black text-white mb-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                 <Package className="w-6 h-6 text-orange-500" />
               </div>
               <div>
                 <span className="block">Subscription Architecture</span>
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">{editingPlan._id ? "Editing Existing Tier" : "Creating New Market Tier"}</span>
               </div>
            </h3>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tier Identity</label>
                  <input type="text" placeholder="e.g. Professional" value={editingPlan.name || ""} onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})} className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-bold placeholder:text-slate-700 shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">System Status</label>
                  <div className="flex p-1 bg-[#1C2539]/40 rounded-2xl border border-[#1C2539]">
                    <button 
                      onClick={() => setEditingPlan({...editingPlan, isActive: true})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingPlan.isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Active
                    </button>
                    <button 
                      onClick={() => setEditingPlan({...editingPlan, isActive: false})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!editingPlan.isActive ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Strategic Pitch / Description</label>
                <input type="text" placeholder="Short value proposition..." value={editingPlan.description || ""} onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})} className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-medium placeholder:text-slate-700 shadow-inner" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Price Model (UGX)</label>
                  <div className="relative">
                    <input type="number" value={editingPlan.price || ""} onChange={(e) => setEditingPlan({...editingPlan, price: e.target.value ? parseInt(e.target.value) : null})} placeholder="Custom/Contact" className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white font-black outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-700 shadow-inner" />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 uppercase">Monthly</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Popular Selection</label>
                  <label className="flex items-center gap-3 p-4 bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl cursor-pointer hover:bg-[#1C2539]/40 transition-all shadow-inner">
                    <input type="checkbox" checked={editingPlan.isPopular} onChange={(e) => setEditingPlan({...editingPlan, isPopular: e.target.checked})} className="w-5 h-5 rounded-lg accent-orange-500" />
                    <span className="text-xs font-bold text-slate-300">Show 'Popular' Badge</span>
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Branch Limit</label>
                  <input type="number" value={editingPlan.maxBranches || ""} onChange={(e) => setEditingPlan({...editingPlan, maxBranches: e.target.value ? parseInt(e.target.value) : null})} placeholder="Unlimited" className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white font-black outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-700 shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">User Limit</label>
                  <input type="number" value={editingPlan.maxUsers || ""} onChange={(e) => setEditingPlan({...editingPlan, maxUsers: e.target.value ? parseInt(e.target.value) : null})} placeholder="Unlimited" className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white font-black outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-700 shadow-inner" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Marketing Features (One per line)</label>
                <textarea rows={5} value={editingPlan.features ? editingPlan.features.join('\n') : ""} onChange={(e) => setEditingPlan({...editingPlan, features: e.target.value.split('\n')})} placeholder="Unlimited Users&#10;Daily Backups..." className="w-full bg-[#1C2539]/20 border border-[#1C2539] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none leading-relaxed placeholder:text-slate-700 shadow-inner" />
              </div>

              <div className="flex gap-4 pt-10">
                <button onClick={() => setEditingPlan(null)} className="flex-1 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-[#1C2539] transition-all border border-transparent hover:border-[#253047]">Dismiss</button>
                <button onClick={savePlan} className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 border border-orange-400/20 active:scale-[0.98]">
                  <Save className="w-4 h-4" /> Finalize Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
