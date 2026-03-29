"use client";

import { useState } from "react";
import {
  Plug,
  CreditCard,
  Smartphone,
  Mail,
  MessageSquare,
  BarChart3,
  Globe,
  ShoppingBag,
  Truck,
  Check,
  X,
  ExternalLink,
  Settings,
  Zap,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useEffect } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  connected: boolean;
  popular?: boolean;
  status?: "active" | "inactive" | "coming_soon";
}

const defaultIntegrations: Integration[] = [
  // Payment
  {
    id: "mtn-momo",
    name: "MTN Mobile Money",
    description: "Accept MTN MoMo payments directly from POS",
    category: "Payment",
    icon: Smartphone,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    connected: true,
    status: "active",
  },
  {
    id: "airtel-money",
    name: "Airtel Money",
    description: "Process Airtel Money mobile payments",
    category: "Payment",
    icon: Smartphone,
    color: "text-red-600",
    bgColor: "bg-red-50",
    connected: true,
    status: "active",
  },
  {
    id: "visa-mastercard",
    name: "Visa / Mastercard",
    description: "Accept card payments via payment terminal",
    category: "Payment",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    connected: false,
    status: "inactive",
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    description: "Online payment gateway for invoices and e-commerce",
    category: "Payment",
    icon: Globe,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    connected: false,
    status: "coming_soon",
    popular: true,
  },
  {
    id: "pesapal",
    name: "Pesapal",
    description: "Accept card and mobile money payments via Pesapal V3 API",
    category: "Payment",
    icon: CreditCard,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    connected: true, // Marking as connected since we added env keys
    status: "active",
    popular: true,
  },
  {
    id: "silicon-pay",
    name: "Silicon Pay",
    description: "Accept Mobile Money payments in Uganda via Silicon Pay API",
    category: "Payment",
    icon: Smartphone,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    connected: true,
    status: "active",
    popular: true,
  },
  // Communication
  {
    id: "email-resend",
    name: "Resend Email",
    description: "Send professional emails via Resend API",
    category: "Communication",
    icon: Mail,
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    connected: true,
    status: "active",
    popular: true,
  },
  {
    id: "email-smtp",
    name: "Email (SMTP)",
    description: "Send receipts and invoices via email",
    category: "Communication",
    icon: Mail,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    connected: false,
    status: "inactive",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business (Twilio)",
    description: "Send receipts and notifications on WhatsApp via Twilio",
    category: "Communication",
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-50",
    connected: true,
    status: "active",
    popular: true,
  },
  {
    id: "sms",
    name: "SMS Gateway (Twilio)",
    description: "Bulk SMS for promotions and receipts via Twilio",
    category: "Communication",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    connected: true,
    status: "active",
  },
  {
    id: "at-sms",
    name: "Africa's Talking SMS",
    description: "Send SMS notifications and receipts via Africa's Talking",
    category: "Communication",
    icon: Smartphone,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    connected: true,
    status: "active",
    popular: true,
  },
  // E-Commerce
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Sync products and orders with your online store",
    category: "E-Commerce",
    icon: ShoppingBag,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    connected: false,
    status: "coming_soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Integrate with Shopify storefront",
    category: "E-Commerce",
    icon: ShoppingBag,
    color: "text-green-700",
    bgColor: "bg-green-50",
    connected: false,
    status: "coming_soon",
  },
  // Accounting
  {
    id: "efris-ura",
    name: "EFRIS - URA",
    description:
      "E-Invoicing & fiscal receipts via Uganda Revenue Authority EFRIS",
    category: "Tax & Compliance",
    icon: FileText,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    connected: false,
    status: "coming_soon",
    popular: true,
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync sales and expenses with QuickBooks",
    category: "Accounting",
    icon: BarChart3,
    color: "text-amber-600",
    bgColor: "bg-emerald-50",
    connected: false,
    status: "coming_soon",
    popular: true,
  },
  // Delivery
  {
    id: "safeboda",
    name: "SafeBoda",
    description: "Arrange deliveries via SafeBoda",
    category: "Delivery",
    icon: Truck,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    connected: false,
    status: "coming_soon",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(defaultIntegrations);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [formValues, setFormValues] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok) {
        const s = (data.data?.settings || data.settings || data) || {};
        setSettings(s);
        setFormValues(s);

        // Update connected status based on settings
        setIntegrations((prev) =>
          prev.map((i) => {
            let isConnected = i.connected;
            if (i.id === "silicon-pay") isConnected = !!s.siliconPayPublicKey;
            if (i.id === "pesapal") isConnected = !!s.pesapalConsumerKey;
            if (i.id === "sms" || i.id === "whatsapp")
              isConnected = !!s.twilioAccountSid;
            if (i.id === "email-resend") isConnected = !!s.emailApiKey;

            return {
              ...i,
              connected: isConnected,
              status:
                isConnected ? "active"
                : i.status === "coming_soon" ? "coming_soon"
                : "inactive",
            };
          }),
        );
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const testConnection = async (id: string) => {
    setTesting(true);
    setTestResult(null);
    const toastId = toast.loading(`Testing ${id} connection...`);
    try {
      let type = id;
      // Map frontend IDs to backend test types if different
      if (id === "at-sms") type = "at_sms";
      if (id === "sms") type = "twilio_sms";
      if (id === "whatsapp") type = "twilio_whatsapp";
      if (id === "email-resend") type = "email_resend";
      if (id === "email-smtp") type = "email_smtp";
      if (id === "mtn-momo" || id === "airtel-money") type = "silicon-pay";

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const testPayload = { ...formValues } as any;

      if (type === "pesapal") {
        testPayload.callbackUrl = `${baseUrl}/api/integrations/pesapal/callback`;
      } else if (type === "silicon-pay") {
        testPayload.callbackUrl = `${baseUrl}/api/integrations/silicon-pay/callback`;
      }

      const res = await fetch("/api/settings/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: testPayload }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: "Connection successful!" });
        toast.success("Connection successful!", { id: toastId });
      } else {
        const errorMsg = data.error || data.message || "Connection failed";
        // Strip HTML if present
        const cleanError = errorMsg.replace(/<[^>]*>/g, "").trim();
        setTestResult({
          success: false,
          message: errorMsg,
        });
        toast.error(cleanError.substring(0, 500), { id: toastId });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(err.message, { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const categories = [
    "all",
    ...Array.from(new Set(integrations.map((i) => i.category))),
  ];

  const filtered = integrations.filter((i) => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      filterCategory === "all" || i.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const connectedCount = integrations.filter((i) => i.connected).length;

  const openConfig = (integration: Integration) => {
    setSelectedIntegration(integration);
    setTestResult(null);
    setShowConfigModal(true);
  };

  const toggleConnect = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    const action = integration?.connected ? "Disconnected" : "Connected";

    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              connected: !i.connected,
              status: !i.connected ? "active" : "inactive",
            }
          : i,
      ),
    );
    setShowConfigModal(false);
    toast.success(`${integration?.name} ${action} successfully`);
  };

  const handleSaveSettings = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.data?.settings || data.settings || data);
        toast.success(`Settings saved successfully`);
        setShowConfigModal(false);
      } else {
        toast.error(data.error || data.message || "Failed to save settings");
        console.error("Save Error:", data.error || data.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500 text-sm mt-1">
            Connect third-party services to extend your POS
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Plug className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.length}
              </p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {connectedCount}
              </p>
              <p className="text-sm text-gray-500">Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.filter((i) => i.status === "coming_soon").length}
              </p>
              <p className="text-sm text-gray-500">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Plug className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                filterCategory === cat
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <div
            key={integration.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 ${integration.bgColor} rounded-lg flex items-center justify-center`}
                >
                  <integration.icon
                    className={`w-6 h-6 ${integration.color}`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {integration.name}
                    </h3>
                    {integration.popular && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {integration.category}
                  </span>
                </div>
              </div>
              {integration.status === "coming_soon" ? (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              ) : integration.connected ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {integration.description}
            </p>
            <div className="flex items-center gap-2">
              {integration.status === "coming_soon" ? (
                <button
                  disabled
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  Coming Soon
                </button>
              ) : integration.connected ? (
                <>
                  <button
                    onClick={() => openConfig(integration)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                  </button>
                  <button
                    onClick={() => toggleConnect(integration.id)}
                    className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openConfig(integration)}
                  className="flex-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Config Modal */}
      {showConfigModal && selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-12 h-12 ${selectedIntegration.bgColor} rounded-lg flex items-center justify-center`}
              >
                <selectedIntegration.icon
                  className={`w-6 h-6 ${selectedIntegration.color}`}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedIntegration.connected ? "Configure" : "Connect"}{" "}
                  {selectedIntegration.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedIntegration.description}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Dynamic form fields based on integration ID */}
              {(selectedIntegration.id === "silicon-pay" ||
                selectedIntegration.id === "mtn-momo" ||
                selectedIntegration.id === "airtel-money") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Public Key
                    </label>
                    <input
                      type="text"
                      name="siliconPayPublicKey"
                      value={formValues.siliconPayPublicKey || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          siliconPayPublicKey: e.target.value,
                        })
                      }
                      placeholder="Enter your Silicon Pay Public Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Encryption Key
                    </label>
                    <input
                      type="password"
                      name="siliconPayEncryptionKey"
                      value={formValues.siliconPayEncryptionKey || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          siliconPayEncryptionKey: e.target.value,
                        })
                      }
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {selectedIntegration.id === "pesapal" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      name="pesapalConsumerKey"
                      value={formValues.pesapalConsumerKey || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          pesapalConsumerKey: e.target.value,
                        })
                      }
                      placeholder="Enter your Pesapal Consumer Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      name="pesapalConsumerSecret"
                      value={formValues.pesapalConsumerSecret || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          pesapalConsumerSecret: e.target.value,
                        })
                      }
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {(selectedIntegration.id === "sms" ||
                selectedIntegration.id === "whatsapp") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account SID
                    </label>
                    <input
                      type="text"
                      name="twilioAccountSid"
                      value={formValues.twilioAccountSid || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          twilioAccountSid: e.target.value,
                        })
                      }
                      placeholder="AC..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Secret
                    </label>
                    <input
                      type="password"
                      name="twilioApiSecret"
                      value={formValues.twilioApiSecret || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          twilioApiSecret: e.target.value,
                        })
                      }
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {selectedIntegration.id === "email-resend" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    name="emailApiKey"
                    value={formValues.emailApiKey || ""}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        emailApiKey: e.target.value,
                      })
                    }
                    placeholder="re_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {selectedIntegration.id === "email-smtp" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      name="emailSmtpHost"
                      value={formValues.emailSmtpHost || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          emailSmtpHost: e.target.value,
                        })
                      }
                      placeholder="smtp.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        name="emailSmtpPort"
                        value={formValues.emailSmtpPort || 587}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            emailSmtpPort: parseInt(e.target.value),
                          })
                        }
                        placeholder="587"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP User
                      </label>
                      <input
                        type="text"
                        name="emailSmtpUser"
                        value={formValues.emailSmtpUser || ""}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            emailSmtpUser: e.target.value,
                          })
                        }
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      name="emailSmtpPassword"
                      value={formValues.emailSmtpPassword || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          emailSmtpPassword: e.target.value,
                        })
                      }
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {(selectedIntegration.id === "email-resend" ||
                selectedIntegration.id === "email-smtp") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Recipient Email
                  </label>
                  <input
                    type="email"
                    name="testEmail"
                    value={formValues.testEmail || ""}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        testEmail: e.target.value,
                      })
                    }
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">For testing email delivery</p>
                </div>
              )}

              {selectedIntegration.id === "at-sms" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="atUsername"
                      value={formValues.atUsername || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          atUsername: e.target.value,
                        })
                      }
                      placeholder="Enter AT Username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      name="atApiKey"
                      value={formValues.atApiKey || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          atApiKey: e.target.value,
                        })
                      }
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {(selectedIntegration.id === "sms" ||
                selectedIntegration.id === "whatsapp" ||
                selectedIntegration.id === "at-sms" ||
                selectedIntegration.id === "silicon-pay") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Phone Number
                  </label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formValues.phoneNumber || ""}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+256..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">For testing SMS/WhatsApp delivery</p>
                </div>
              )}

              {!["silicon-pay", "pesapal", "sms", "whatsapp", "email-resend", "at-sms", "mtn-momo", "airtel-money"].includes(selectedIntegration.id) && (
                <p className="text-sm text-gray-500 italic">No configuration fields available for this integration.</p>
              )}
            </div>
            {testResult && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm break-words max-h-40 overflow-auto ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult.message.replace(/<[^>]*>/g, "").trim()}
              </div>
            )}
            <div className="flex justify-between items-center mt-6">
              <div>
                {selectedIntegration.status !== "coming_soon" && (
                  <button
                    onClick={() => testConnection(selectedIntegration.id)}
                    disabled={testing}
                    className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </button>
                )}
                {selectedIntegration.id === "at-sms" && (
                  <button
                    onClick={async () => {
                      setTesting(true);
                      setTestResult(null);
                      const toastId = toast.loading("Checking balance...");
                      try {
                        const res = await fetch("/api/settings/integrations/test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "at_balance", payload: formValues }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setTestResult({ success: true, message: data.message });
                          toast.success(data.message, { id: toastId });
                        } else {
                          setTestResult({ success: false, message: data.error || data.message });
                          toast.error(data.error || data.message, { id: toastId });
                        }
                      } catch (err: any) {
                        setTestResult({ success: false, message: err.message });
                        toast.error(err.message, { id: toastId });
                      } finally {
                        setTesting(false);
                      }
                    }}
                    disabled={testing}
                    className="ml-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    Check Balance
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    selectedIntegration.connected
                      ? handleSaveSettings(selectedIntegration.id)
                      : toggleConnect(selectedIntegration.id)
                  }
                  className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  {selectedIntegration.connected ? "Save Changes" : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
