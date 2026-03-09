"use client";

import { useState } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Clock,
  Package,
  Bell,
  Mail,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Users,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerLabel: string;
  actions: { type: string; label: string }[];
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

const defaultRules: AutomationRule[] = [
  {
    id: "1",
    name: "Low Stock Alert",
    description: "Get notified when product stock falls below reorder level",
    trigger: "stock_below_threshold",
    triggerLabel: "Stock falls below reorder level",
    actions: [
      { type: "notification", label: "Send in-app notification" },
      { type: "email", label: "Send email to admin" },
    ],
    enabled: true,
    lastTriggered: "2026-03-09T08:30:00",
    triggerCount: 24,
  },
  {
    id: "2",
    name: "Daily Sales Summary",
    description: "Receive a daily summary of all sales at end of business day",
    trigger: "scheduled_daily",
    triggerLabel: "Every day at 8:00 PM",
    actions: [{ type: "email", label: "Send email report" }],
    enabled: true,
    lastTriggered: "2026-03-08T20:00:00",
    triggerCount: 45,
  },
  {
    id: "3",
    name: "New Customer Welcome",
    description:
      "Automatically send a welcome message when a new customer is added",
    trigger: "customer_created",
    triggerLabel: "New customer registered",
    actions: [{ type: "sms", label: "Send SMS welcome message" }],
    enabled: false,
    triggerCount: 0,
  },
  {
    id: "4",
    name: "Large Sale Notification",
    description: "Get alerted when a sale exceeds a certain amount",
    trigger: "sale_above_amount",
    triggerLabel: "Sale total above UGX 500,000",
    actions: [{ type: "notification", label: "Send in-app notification" }],
    enabled: true,
    lastTriggered: "2026-03-07T14:22:00",
    triggerCount: 8,
  },
  {
    id: "5",
    name: "Purchase Order Reminder",
    description:
      "Remind to reorder when draft purchase orders are pending for 3+ days",
    trigger: "po_pending_days",
    triggerLabel: "Purchase order draft > 3 days",
    actions: [{ type: "notification", label: "Send reminder notification" }],
    enabled: true,
    triggerCount: 3,
  },
  {
    id: "6",
    name: "Invoice Overdue Alert",
    description: "Notify when an invoice passes its due date",
    trigger: "invoice_overdue",
    triggerLabel: "Invoice past due date",
    actions: [
      { type: "notification", label: "Send in-app notification" },
      { type: "email", label: "Send reminder email to customer" },
    ],
    enabled: true,
    triggerCount: 12,
  },
];

const triggerOptions = [
  {
    value: "stock_below_threshold",
    label: "Stock falls below threshold",
    icon: Package,
  },
  { value: "sale_completed", label: "Sale completed", icon: ShoppingCart },
  { value: "sale_above_amount", label: "Sale above amount", icon: DollarSign },
  { value: "customer_created", label: "New customer added", icon: Users },
  { value: "invoice_overdue", label: "Invoice overdue", icon: AlertTriangle },
  { value: "scheduled_daily", label: "Daily schedule", icon: Clock },
  { value: "po_pending_days", label: "Purchase order pending", icon: Package },
];

const actionOptions = [
  { value: "notification", label: "In-app notification", icon: Bell },
  { value: "email", label: "Send email", icon: Mail },
  { value: "sms", label: "Send SMS", icon: Bell },
];

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger: "stock_below_threshold",
    actions: [{ type: "notification", label: "In-app notification" }],
  });

  const toggleRule = (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const openAdd = () => {
    setEditingRule(null);
    setForm({
      name: "",
      description: "",
      trigger: "stock_below_threshold",
      actions: [{ type: "notification", label: "In-app notification" }],
    });
    setShowModal(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      actions: [...rule.actions],
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const triggerLabel =
      triggerOptions.find((t) => t.value === form.trigger)?.label ||
      form.trigger;
    if (editingRule) {
      setRules(
        rules.map((r) =>
          r.id === editingRule.id ? { ...r, ...form, triggerLabel } : r,
        ),
      );
    } else {
      setRules([
        ...rules,
        {
          id: Date.now().toString(),
          ...form,
          triggerLabel,
          enabled: true,
          triggerCount: 0,
        },
      ]);
    }
    setShowModal(false);
  };

  const addAction = () => {
    setForm({
      ...form,
      actions: [
        ...form.actions,
        { type: "notification", label: "In-app notification" },
      ],
    });
  };

  const removeAction = (idx: number) => {
    setForm({
      ...form,
      actions: form.actions.filter((_, i) => i !== idx),
    });
  };

  const updateAction = (idx: number, value: string) => {
    const opt = actionOptions.find((a) => a.value === value);
    const newActions = [...form.actions];
    newActions[idx] = { type: value, label: opt?.label || value };
    setForm({ ...form, actions: newActions });
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set up rules to automate repetitive tasks
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
              <p className="text-sm text-gray-500">Total Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rules.reduce((a, r) => a + r.triggerCount, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Executions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => {
          const TriggerIcon =
            triggerOptions.find((t) => t.value === rule.trigger)?.icon || Zap;
          return (
            <div
              key={rule.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rule.enabled ? "bg-teal-50" : "bg-gray-100"
                    }`}
                  >
                    <TriggerIcon
                      className={`w-5 h-5 ${rule.enabled ? "text-teal-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {rule.name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          rule.enabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rule.enabled ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="bg-gray-50 px-2 py-1 rounded">
                        When: {rule.triggerLabel}
                      </span>
                      <ChevronRight className="w-3 h-3" />
                      {rule.actions.map((a, i) => (
                        <span key={i} className="bg-gray-50 px-2 py-1 rounded">
                          {a.label}
                        </span>
                      ))}
                    </div>
                    {rule.lastTriggered && (
                      <p className="text-xs text-gray-400 mt-2">
                        Last triggered:{" "}
                        {new Date(rule.lastTriggered).toLocaleDateString(
                          "en-UG",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                        {" · "}
                        {rule.triggerCount} total executions
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded-lg ${
                      rule.enabled
                        ? "hover:bg-amber-50 text-amber-500"
                        : "hover:bg-emerald-50 text-emerald-500"
                    }`}
                    title={rule.enabled ? "Pause" : "Activate"}
                  >
                    {rule.enabled ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {rules.length === 0 && (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
            <Zap className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No automation rules yet</p>
            <p className="text-sm mt-1">
              Create your first rule to automate tasks
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRule ? "Edit Rule" : "New Automation Rule"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Low Stock Alert"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="What does this rule do?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger (When)
                </label>
                <select
                  value={form.trigger}
                  onChange={(e) =>
                    setForm({ ...form, trigger: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {triggerOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Actions (Then)
                  </label>
                  <button
                    onClick={addAction}
                    className="text-xs text-teal-600 hover:underline"
                  >
                    + Add Action
                  </button>
                </div>
                <div className="space-y-2">
                  {form.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(i, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {actionOptions.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      {form.actions.length > 1 && (
                        <button
                          onClick={() => removeAction(i)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name}
                className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {editingRule ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
