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
  // Communication
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
    name: "WhatsApp Business",
    description: "Send receipts and notifications on WhatsApp",
    category: "Communication",
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-50",
    connected: false,
    status: "coming_soon",
    popular: true,
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "Bulk SMS for promotions and receipts",
    category: "Communication",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    connected: false,
    status: "coming_soon",
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
    setShowConfigModal(true);
  };

  const toggleConnect = (id: string) => {
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  placeholder="Enter your API secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleConnect(selectedIntegration.id)}
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                {selectedIntegration.connected ? "Save Changes" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
