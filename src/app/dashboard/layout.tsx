"use client";

import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
  Suspense,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Warehouse,
  Settings,
  ChevronLeft,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Plug,
  Zap,
  FileStack,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  User,
  RotateCcw,
  Truck,
  Layers,
  Barcode,
  Printer,
  Moon,
  Sun,
  Building2,
  Wallet,
  History,
  CreditCard,
  DollarSign,
  Banknote,
  PieChart,
  Sparkles,
  Brain,
  Maximize2,
  Minimize2,
  Send,
  Loader2,
  SlidersHorizontal,
  Plus,
  Globe,
  Mail,
  WifiOff,
  Calendar,
} from "lucide-react";
import {
  getInitials,
  getDefaultCurrencyRates,
  setCurrencyDisplayConfig,
  setPrintBrandingConfig,
} from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";
import { getAiContextLabel, getAiQuickPrompts } from "@/lib/ai";
import { getDefaultPermissionsForRole } from "@/lib/roles";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: string;
  settings: {
    currency: string;
    taxRate: number;
    receiptHeader?: string;
    receiptFooter?: string;
    physicalAddress?: string;
    phoneNumber?: string;
    emailAddress?: string;
    lowStockThreshold?: number;
    theme?: string;
    sidebarDefaultCollapsed?: boolean;
    enableBarcodeScanning?: boolean;
    barcodeScanSound?: boolean;
    barcodeFailedScanAlert?: boolean;
    barcodeShowPriceOnLabelsByDefault?: boolean;
    barcodeDefaultFormat?: string;
    barcodeDefaultLabelSize?: string;
    barcodeDefaultPaperSize?: string;
    barcodeDefaultPrinterType?: string;
    barcodeDefaultHeightMm?: number;
    barcodePrefix?: string;
    barcodeAutoGenerateOnProductCreate?: boolean;
    rolePermissions?: Record<string, string[]>;
    aiAssistantEnabled?: boolean;
    sessionTimeout?: number;
    currencyRates?: { code: string; rate: number; lastUpdatedAt?: string }[];
    currencyLedger?: string;
  };
  saasProduct: string;
  businessName?: string;
}

interface SessionContextType {
  user: UserData | null;
  tenant: TenantData | null;
  loading: boolean;
}

interface HeaderNotification {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  message: string;
  createdAt: string;
  href: string;
  read: boolean;
}

interface AIAssistantAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

interface AIAssistantHighlight {
  label: string;
  value: string;
}

interface AIAssistantTable {
  title: string;
  columns: string[];
  rows: string[][];
}

interface AIAssistantHistoryItem {
  id: string;
  prompt: string;
  reply: string;
  createdAt: string;
  contextLabel: string;
}

interface AIAssistantMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: AIAssistantAction;
  highlights?: AIAssistantHighlight[];
  table?: AIAssistantTable;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  tenant: null,
  loading: true,
});

export function useSession() {
  return useContext(SessionContext);
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    label: "MAIN",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "POS Terminal", href: "/dashboard/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { name: "Inventory", href: "/dashboard/inventory", icon: Package },
      { name: "Sales", href: "/dashboard/sales", icon: TrendingUp },
      { name: "Purchases", href: "/dashboard/purchases", icon: ShoppingBag },
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      {
        name: "Suppliers",
        href: "/dashboard/vendors",
        icon: Truck,
        children: [
          {
            name: "Suppliers",
            href: "/dashboard/vendors?tab=suppliers",
            icon: Users,
          },
          {
            name: "Pay Supplier",
            href: "/dashboard/vendors?tab=pay",
            icon: Wallet,
          },
          {
            name: "Payment History",
            href: "/dashboard/vendors?tab=history",
            icon: History,
          },
          {
            name: "Supplier Balances",
            href: "/dashboard/vendors?tab=balances",
            icon: CreditCard,
          },
        ],
      },
    ],
  },
  {
    label: "FINANCE",
    items: [
      {
        name: "Expenses",
        href: "/dashboard/expenses",
        icon: TrendingDown,
      },
      {
        name: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
      },
      {
        name: "Cash Flow",
        href: "/dashboard/cashflow",
        icon: DollarSign,
        children: [
          {
            name: "Cash Flow Report",
            href: "/dashboard/cashflow?tab=report",
            icon: Banknote,
          },
          {
            name: "Cash Flow Summary",
            href: "/dashboard/cashflow?tab=summary",
            icon: PieChart,
          },
          {
            name: "Quick Periods",
            href: "/dashboard/cashflow?tab=periods",
            icon: BarChart3,
          },
        ],
      },
      {
        name: "Fiscal Year Management",
        href: "/dashboard/fiscal-years?tab=config",
        icon: Calendar,
        children: [
          {
            name: "Configuration",
            href: "/dashboard/fiscal-years?tab=config",
            icon: Settings,
          },
          {
            name: "Financial Summary",
            href: "/dashboard/fiscal-years?tab=summary",
            icon: BarChart3,
          },
          {
            name: "Archive",
            href: "/dashboard/fiscal-years?tab=archive",
            icon: History,
          },
        ],
      },
      {
        name: "Taxes",
        href: "/dashboard/taxes",
        icon: Receipt,
      },
      {
        name: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        name: "AI Assistant",
        href: "/dashboard/ai?tab=assistant",
        icon: Sparkles,
      },
      {
        name: "Smart Insights",
        href: "/dashboard/ai?tab=sales-intelligence",
        icon: Brain,
        children: [
          {
            name: "Sales Intelligence",
            href: "/dashboard/ai?tab=sales-intelligence",
            icon: TrendingUp,
          },
          {
            name: "Inventory Forecasting",
            href: "/dashboard/ai?tab=inventory-forecasting",
            icon: Package,
          },
          {
            name: "Customer Behaviour",
            href: "/dashboard/ai?tab=customer-behaviour",
            icon: Users,
          },
        ],
      },
      {
        name: "Automated Reports",
        href: "/dashboard/ai?tab=daily-summary",
        icon: FileText,
        children: [
          {
            name: "Daily Summary",
            href: "/dashboard/ai?tab=daily-summary",
            icon: Clock,
          },
          {
            name: "Weekly Business Review",
            href: "/dashboard/ai?tab=weekly-review",
            icon: BarChart3,
          },
          {
            name: "Custom AI Report",
            href: "/dashboard/ai?tab=custom-report",
            icon: FileStack,
          },
        ],
      },
      {
        name: "AI Settings",
        href: "/dashboard/ai?tab=ai-settings",
        icon: Settings,
        children: [
          {
            name: "Language & Tone",
            href: "/dashboard/ai?tab=ai-settings&section=language-tone",
            icon: Globe,
          },
          {
            name: "Notification Preferences",
            href: "/dashboard/ai?tab=ai-settings&section=notifications",
            icon: Bell,
          },
          {
            name: "Model & Data Preferences",
            href: "/dashboard/ai?tab=ai-settings&section=model-data",
            icon: SlidersHorizontal,
          },
        ],
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        name: "Store Management",
        href: "/dashboard/store-management",
        icon: Building2,
        children: [
          {
            name: "Store Profile",
            href: "/dashboard/store-management?tab=store-profile",
            icon: Building2,
          },
          {
            name: "Branches",
            href: "/dashboard/store-management?tab=branches-all",
            icon: Warehouse,
          },
          {
            name: "Staff Management",
            href: "/dashboard/store-management?tab=staff-all",
            icon: Users,
          },
          {
            name: "Till & Cash Register",
            href: "/dashboard/store-management?tab=till-open-close",
            icon: FileText,
          },
          {
            name: "Store Settings",
            href: "/dashboard/store-management?tab=settings-hours",
            icon: Clock,
          },
        ],
      },
      {
        name: "Subscription",
        href: "/dashboard/subscription",
        icon: CreditCard,
      },
      {
        name: "Warehouse & Storage",
        href: "/dashboard/warehouses",
        icon: Warehouse,
        children: [
          {
            name: "All Locations",
            href: "/dashboard/warehouses?tab=all",
            icon: Warehouse,
          },
          {
            name: "Add Location",
            href: "/dashboard/warehouses?tab=add",
            icon: Plus,
          },
          {
            name: "Location Inventory",
            href: "/dashboard/warehouses?tab=inventory",
            icon: Package,
          },
          {
            name: "Stock Adjustments",
            href: "/dashboard/warehouses?tab=adjustments",
            icon: RotateCcw,
          },
        ],
      },
      { name: "Stock", href: "/dashboard/stock", icon: Warehouse },
      {
        name: "Barcode Manager",
        href: "/dashboard/barcodes?tab=generate",
        icon: Barcode,
        children: [
          {
            name: "Generate Barcodes",
            href: "/dashboard/barcodes?tab=generate",
            icon: Barcode,
          },
          {
            name: "Print Labels",
            href: "/dashboard/barcodes?tab=print",
            icon: Printer,
          },
          {
            name: "Barcode Settings",
            href: "/dashboard/barcodes?tab=settings",
            icon: Settings,
          },
          {
            name: "Scan History",
            href: "/dashboard/barcodes?tab=history",
            icon: History,
          },
        ],
      },
      { name: "Batches", href: "/dashboard/batches", icon: Layers },
      { name: "Returns", href: "/dashboard/returns", icon: RotateCcw },
      { name: "Integrations", href: "/dashboard/integrations", icon: Plug },
      { name: "Automation", href: "/dashboard/automation", icon: Zap },
      { name: "Templates", href: "/dashboard/templates", icon: FileStack },
      { name: "Offline & Desktop", href: "/dashboard/offline", icon: WifiOff },
      {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        children: [
          {
            name: "General",
            href: "/dashboard/settings?section=general",
            icon: Settings,
          },
          {
            name: "Currency & Localization",
            href: "/dashboard/settings?section=currency",
            icon: Globe,
          },
          {
            name: "Email & Notifications",
            href: "/dashboard/settings?section=email",
            icon: Mail,
          },
        ],
      },
    ],
  },
];

const pathPermissionMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/pos": "pos",
  "/dashboard/inventory": "inventory",
  "/dashboard/sales": "sales",
  "/dashboard/purchases": "purchases",
  "/dashboard/customers": "customers",
  "/dashboard/vendors": "suppliers",
  "/dashboard/expenses": "expenses",
  "/dashboard/invoices": "invoices",
  "/dashboard/cashflow": "cashflow",
  "/dashboard/taxes": "taxes",
  "/dashboard/reports": "reports",
  "/dashboard/ai": "ai",
  "/dashboard/barcodes": "inventory",
  "/dashboard/warehouses": "warehouses",
  "/dashboard/settings": "settings",
  "/dashboard/fiscal-years": "reports",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeQueryString =
    typeof window !== "undefined" ? window.location.search : "";
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showAiHistory, setShowAiHistory] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiMessageInput, setAiMessageInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiActionPendingId, setAiActionPendingId] = useState<string | null>(
    null,
  );
  const [aiQuickPrompts, setAiQuickPrompts] = useState<string[]>([
    "How are sales performing today?",
    "What should I restock this week?",
    "Which invoices are at risk?",
  ]);
  const [aiHistory, setAiHistory] = useState<AIAssistantHistoryItem[]>([]);
  const [aiMessages, setAiMessages] = useState<AIAssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can help with sales trends, inventory forecasting, and customer payment risks.",
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);
  const aiMessagesRef = useRef<HTMLDivElement>(null);
  const aiHistoryStorageKey = user?.id
    ? `meka-ai-panel-history-${user.id}`
    : "meka-ai-panel-history";

  const applyThemePreference = useCallback((theme: string | undefined) => {
    const useDark = theme === "dark";
    setDarkMode(useDark);
    document.documentElement.classList.toggle("dark", useDark);
    try {
      localStorage.setItem("meka-dark-mode", useDark ? "1" : "0");
    } catch {}
  }, []);

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuKey)
        ? prev.filter((n) => n !== menuKey)
        : [...prev, menuKey],
    );
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("meka-dark-mode", next ? "1" : "0");
    } catch {}
  };

  // Restore dark mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meka-dark-mode");
      if (saved === "1") {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      } else if (saved === "0") {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: string }>).detail;
      applyThemePreference(detail?.theme);
    };

    window.addEventListener("meka-theme-change", handleThemeChange);
    return () =>
      window.removeEventListener("meka-theme-change", handleThemeChange);
  }, [applyThemePreference]);

  useEffect(() => {
    if (!tenant) return;

    const referenceCurrency = tenant.settings.currency || "UGX";
    const configuredRates = tenant.settings.currencyRates || [];
    const fallbackRates = getDefaultCurrencyRates(referenceCurrency);
    const mergedRateMap = new Map<
      string,
      { code: string; rate: number; lastUpdatedAt?: string }
    >();

    for (const rate of fallbackRates) {
      mergedRateMap.set(rate.code.toUpperCase(), {
        code: rate.code.toUpperCase(),
        rate: Number(rate.rate),
      });
    }

    for (const rate of configuredRates) {
      const code = String(rate.code || "").toUpperCase();
      const numericRate = Number(rate.rate);
      if (!code || !Number.isFinite(numericRate) || numericRate <= 0) {
        continue;
      }

      mergedRateMap.set(code, {
        code,
        rate: numericRate,
        lastUpdatedAt: rate.lastUpdatedAt,
      });
    }

    setCurrencyDisplayConfig({
      ledgerCurrency: tenant.settings.currencyLedger || "UGX",
      referenceCurrency,
      rates: Array.from(mergedRateMap.values()).filter(
        (rate) => rate.code !== referenceCurrency.toUpperCase(),
      ),
    });

    setPrintBrandingConfig({
      businessName: tenant.name,
      logo: tenant.logo,
      receiptHeader: tenant.settings.receiptHeader,
      receiptFooter: tenant.settings.receiptFooter,
      physicalAddress: tenant.settings.physicalAddress,
      phoneNumber: tenant.settings.phoneNumber,
      emailAddress: tenant.settings.emailAddress,
    });
  }, [tenant]);

  const matchesHref = useCallback(
    (href: string) => {
      const [hrefPath, hrefQueryString] = href.split("?");
      if (pathname !== hrefPath) return false;
      if (!hrefQueryString) return true;

      const hrefParams = new URLSearchParams(hrefQueryString);
      const activeParams = new URLSearchParams(activeQueryString);
      for (const [key, value] of hrefParams.entries()) {
        if (activeParams.get(key) !== value) {
          return false;
        }
      }
      return true;
    },
    [pathname, activeQueryString],
  );

  const hasItemMatch = useCallback(
    (item: NavItem): boolean => {
      if (matchesHref(item.href)) return true;
      if (!item.children || item.children.length === 0) return false;
      return item.children.some((child) => hasItemMatch(child));
    },
    [matchesHref],
  );

  // Auto-expand menus whose descendants match the current path
  useEffect(() => {
    const expanded: string[] = [];

    const visit = (items: NavItem[], parentKey: string) => {
      for (const item of items) {
        const itemKey = parentKey ? `${parentKey}/${item.name}` : item.name;
        if (item.children && item.children.length > 0) {
          if (
            matchesHref(item.href) ||
            item.children.some((child) => hasItemMatch(child))
          ) {
            expanded.push(itemKey);
          }
          visit(item.children, itemKey);
        }
      }
    };

    for (const section of navigation) {
      visit(section.items, section.label);
    }

    setExpandedMenus((prev) => {
      const combined = new Set([...prev, ...expanded]);
      return Array.from(combined);
    });
  }, [matchesHref, hasItemMatch]);

  const rolePermissions =
    tenant?.settings?.rolePermissions?.[user?.role || ""] ||
    getDefaultPermissionsForRole(user?.role || "cashier");

  const canAccessPath = useCallback(
    (href: string) => {
      if (user?.role === "admin") return true;
      const basePath = href.split("?")[0];
      const permission = pathPermissionMap[basePath];
      if (!permission) return true;
      return rolePermissions.includes(permission);
    },
    [rolePermissions, user?.role],
  );

  const filterNavItem = useCallback(
    (item: NavItem): NavItem | null => {
      const visibleChildren = (item.children || [])
        .map((child) => filterNavItem(child))
        .filter((child): child is NavItem => Boolean(child));

      if (!canAccessPath(item.href) && visibleChildren.length === 0) {
        return null;
      }

      return {
        ...item,
        children: visibleChildren.length > 0 ? visibleChildren : undefined,
      };
    },
    [canAccessPath],
  );

  const visibleNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterNavItem(item))
        .filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0);

  const flattenNavItems = (items: NavItem[]): NavItem[] =>
    items.flatMap((item) => [item, ...flattenNavItems(item.children || [])]);

  const allNavItems = visibleNavigation.flatMap((section) =>
    flattenNavItems(section.items),
  );

  const renderNavigationItem = (
    item: NavItem,
    sectionKey: string,
    depth = 0,
    parentKey = "",
  ): React.ReactNode => {
    const itemKey = parentKey
      ? `${parentKey}/${item.name}`
      : `${sectionKey}/${item.name}`;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isActive = hasItemMatch(item);
    const isExpanded = expandedMenus.includes(itemKey);
    const childIndentClass = depth === 0 ? "ml-5" : "ml-4";

    if (hasChildren) {
      return (
        <div key={itemKey}>
          <Link
            href={item.href}
            onClick={() => {
              if (!expandedMenus.includes(itemKey)) {
                toggleMenu(itemKey);
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${depth === 0 ? "text-[13px]" : "text-[12px]"} ${
              isActive
                ? "bg-linear-to-r from-orange-500/20 to-amber-500/10 text-orange-400 shadow-sm shadow-orange-500/5"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            }`}
            title={sidebarCollapsed ? item.name : undefined}
          >
            <item.icon
              className={`${depth === 0 ? "w-4.5 h-4.5" : "w-4 h-4"} shrink-0 ${isActive ? "text-orange-400" : ""}`}
            />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu(itemKey);
                  }}
                />
              </>
            )}
          </Link>
          {isExpanded && !sidebarCollapsed && (
            <div
              className={`${childIndentClass} mt-0.5 space-y-0.5 border-l border-white/10 pl-3`}
            >
              {item.children!.map((child) =>
                renderNavigationItem(child, sectionKey, depth + 1, itemKey),
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={itemKey}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${depth === 0 ? "text-[13px]" : "text-[12px]"} ${
          isActive
            ? "bg-linear-to-r from-orange-500/20 to-amber-500/10 text-orange-400 shadow-sm shadow-orange-500/5"
            : depth > 0
              ? "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
        title={sidebarCollapsed ? item.name : undefined}
      >
        <item.icon
          className={`${depth === 0 ? "w-4.5 h-4.5" : "w-3.5 h-3.5"} shrink-0 ${isActive ? "text-orange-400" : ""}`}
        />
        {!sidebarCollapsed && item.name}
        {isActive && !sidebarCollapsed && depth === 0 && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />
        )}
      </Link>
    );
  };
  const searchResults = searchQuery.trim()
    ? allNavItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setNotificationsLoading(true);
    try {
      const data = await apiRequest<{
        notifications?: HeaderNotification[];
      }>("/api/notifications?limit=10", {
        cache: "no-store",
      });
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  const persistNotificationReads = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      setNotifications((prev) =>
        prev.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, read: true }
            : notification,
        ),
      );

      try {
        await apiRequest<{ updated: number }>("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      } catch {
        fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      const target = notifications.find(
        (notification) => notification.id === id,
      );
      if (!target || target.read) return;
      await persistNotificationReads([id]);
    },
    [notifications, persistNotificationReads],
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    await persistNotificationReads(unreadIds);
  }, [notifications, persistNotificationReads]);

  const openNotification = useCallback(
    async (notification: HeaderNotification) => {
      await markNotificationRead(notification.id);
      setShowNotifications(false);
      router.push(notification.href);
    },
    [markNotificationRead, router],
  );

  const sendAiMessage = useCallback(
    async (preset?: string) => {
      const message = (preset ?? aiMessageInput).trim();
      if (!message || aiSending) return;

      const userMessage: AIAssistantMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      };

      setAiMessages((prev) => [...prev, userMessage]);
      setAiMessageInput("");
      setAiSending(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            contextPath: pathname,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get AI response");
        }

        const data = (await res.json()) as {
          reply?: string;
          suggestedAction?: AIAssistantAction;
          highlights?: AIAssistantHighlight[];
          table?: AIAssistantTable;
        };

        const reply =
          data.reply ||
          "I could not generate a response right now. Please try again.";

        setAiMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: reply,
            action: data.suggestedAction,
            highlights: data.highlights,
            table: data.table,
          },
        ]);

        setAiHistory((prev) =>
          [
            {
              id: `history-${Date.now()}`,
              prompt: message,
              reply,
              createdAt: new Date().toISOString(),
              contextLabel: getAiContextLabel(pathname),
            },
            ...prev,
          ].slice(0, 10),
        );
      } catch {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content:
              "I could not reach the assistant service. Please try again shortly.",
          },
        ]);
      } finally {
        setAiSending(false);
      }
    },
    [aiMessageInput, aiSending, pathname],
  );

  const confirmAiAction = useCallback(
    async (messageId: string) => {
      const target = aiMessages.find((m) => m.id === messageId);
      if (!target?.action || aiActionPendingId === messageId) return;

      setAiActionPendingId(messageId);
      setAiSending(true);
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Confirm action ${target.action.id}`,
            confirmAction: true,
            actionId: target.action.id,
          }),
        });

        const data = (await res.json()) as { reply?: string };
        setAiMessages((prev) => [
          ...prev,
          {
            id: `assistant-confirm-${Date.now()}`,
            role: "assistant",
            content: data.reply || "Action confirmed.",
          },
        ]);
        router.push(target.action.href);
        setShowAiAssistant(false);
      } catch {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `assistant-confirm-error-${Date.now()}`,
            role: "assistant",
            content: "I could not complete that action. Please retry.",
          },
        ]);
      } finally {
        setAiSending(false);
        setAiActionPendingId(null);
      }
    },
    [aiActionPendingId, aiMessages, router],
  );

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const data = await apiRequest<{
        user: UserData;
        tenant: TenantData;
      }>("/api/auth/me");
      setUser(data.user);
      setTenant(data.tenant);

      const savedTheme = (() => {
        try {
          return localStorage.getItem("meka-dark-mode");
        } catch {
          return null;
        }
      })();

      if (savedTheme !== "1" && savedTheme !== "0") {
        applyThemePreference(data.tenant?.settings?.theme);
      }

      setSidebarCollapsed(
        Boolean(data.tenant?.settings?.sidebarDefaultCollapsed),
      );
    } catch {
      router.push("/sign-in");
    } finally {
      setLoading(false);
    }
  }, [router, applyThemePreference]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      void fetchSession();
    };

    window.addEventListener("meka-settings-updated", handleSettingsUpdated);
    return () =>
      window.removeEventListener(
        "meka-settings-updated",
        handleSettingsUpdated,
      );
  }, [fetchSession]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 60000);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications, user]);

  useEffect(() => {
    if (!user || !tenant) return;

    const baseTimeout = Number(tenant.settings?.sessionTimeout || 0);
    if (!Number.isFinite(baseTimeout) || baseTimeout <= 0) return;

    // For POS terminal, use a much longer idle timeout (e.g., 12 hours)
    // to avoid disruptions during the business day.
    const isPosPage = pathname === "/dashboard/pos";
    const timeoutMinutes = isPosPage ? Math.max(720, baseTimeout) : baseTimeout;

    let timeoutId: number | undefined;

    const forceSignOut = async () => {
      try {
        await fetch("/api/auth/sign-out", { method: "POST" });
      } finally {
        router.push("/sign-in");
      }
    };

    const resetIdleTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(
        () => {
          void forceSignOut();
        },
        timeoutMinutes * 60 * 1000,
      );
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    resetIdleTimer();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetIdleTimer);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, tenant, router]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("meka-ai-chat-history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as AIAssistantMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiMessages(parsed);
        }
      } catch {
        // ignore invalid stored history
      }
    }
  }, []);

  useEffect(() => {
    setAiQuickPrompts(getAiQuickPrompts(pathname).slice(0, 4));
  }, [pathname]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(aiHistoryStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AIAssistantHistoryItem[];
      if (Array.isArray(parsed)) {
        setAiHistory(parsed);
      }
    } catch {
      // ignore invalid session history
    }
  }, [aiHistoryStorageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(aiHistoryStorageKey, JSON.stringify(aiHistory));
    } catch {
      // ignore storage failures
    }
  }, [aiHistory, aiHistoryStorageKey]);

  useEffect(() => {
    localStorage.setItem(
      "meka-ai-chat-history",
      JSON.stringify(aiMessages.slice(-20)),
    );

    if (aiMessagesRef.current) {
      aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const handleSignOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/sign-in");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, tenant, loading }}>
      <div className="min-h-screen flex bg-[hsl(220,20%,97%)] dark:bg-gray-950">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-linear-to-b from-[hsl(222,47%,11%)] to-[hsl(224,50%,15%)] text-gray-300 flex flex-col transition-all duration-300 z-50 lg:z-40 ${
            sidebarCollapsed ? "w-17" : "w-60"
          } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-white/5">
            <div className="w-9 h-9 bg-linear-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="ml-3 text-lg font-bold tracking-tight text-white">
                Meka PoS
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="ml-auto lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex ml-auto w-7 h-7 items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-5 px-2 space-y-6">
            {visibleNavigation.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500/80">
                    {section.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) =>
                    renderNavigationItem(item, section.label),
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar footer */}
          {!sidebarCollapsed && (
            <div className="p-3 mx-2 mb-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name ? getInitials(user.name) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div
          className={`content-area flex-1 transition-all duration-300 min-w-0 ${
            sidebarCollapsed ? "lg:ml-17" : "lg:ml-60"
          }`}
        >
          {/* Top bar */}
          <header className="h-16 bg-orange-500 border-b border-orange-600/80 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                <div className="flex flex-col gap-1 w-4">
                  <span className="block w-full h-0.5 bg-white rounded-full"></span>
                  <span className="block w-full h-0.5 bg-white rounded-full"></span>
                  <span className="block w-full h-0.5 bg-white rounded-full"></span>
                </div>
              </button>
              {/* Greeting */}
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-white">
                  {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-orange-100">
                  {tenant?.businessName && (
                    <>
                      <Building2 className="h-3 w-3" />
                      <span>{tenant.businessName}</span>
                      <span className="text-orange-200/80">|</span>
                    </>
                  )}
                  <span>
                    {new Date().toLocaleDateString("en-UG", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {/* Search with results dropdown */}
              <div className="relative" ref={searchRef}>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchFocused(false);
                      setSearchQuery("");
                    }
                    if (e.key === "Enter" && searchResults.length > 0) {
                      router.push(searchResults[0].href);
                      setSearchQuery("");
                      setSearchFocused(false);
                    }
                  }}
                  className="pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm border border-gray-200/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 w-full md:w-60 lg:w-72 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-750"
                  autoComplete="off"
                  name="dashboard_search_uniqueness_v3"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Search results dropdown */}
                {searchFocused && searchQuery.trim() && (
                  <div className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-200/80 rounded-2xl shadow-xl shadow-gray-200/50 py-2 z-50 overflow-hidden">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <item.icon className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {item.href}
                            </p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No pages found for &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tenant badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {tenant?.name}
                </span>
                <span className="text-[10px] bg-linear-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  {tenant?.plan}
                </span>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-300"
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </button>

              {/* Quick settings for admin */}
              {user?.role === "admin" && (
                <Link
                  href="/dashboard/settings"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  title="Settings"
                >
                  <Settings className="w-4.5 h-4.5" />
                </Link>
              )}

              {tenant?.settings?.aiAssistantEnabled !== false && (
                <button
                  onClick={() => {
                    setShowAiAssistant((prev) => !prev);
                    setShowAiHistory(false);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                  className={`relative h-9 px-3 rounded-xl flex items-center gap-2 transition-colors ${
                    showAiAssistant
                      ? "bg-orange-100 text-orange-700"
                      : "bg-white/75 text-orange-700 hover:bg-white hover:text-orange-800"
                  }`}
                  title="Ask Meka AI"
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden lg:inline text-xs font-semibold tracking-wide">
                    AI
                  </span>
                </button>
              )}

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                    if (!showNotifications) {
                      fetchNotifications();
                    }
                  }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200/80 rounded-2xl shadow-xl shadow-gray-200/50 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            {unreadCount} new
                          </span>
                        )}
                        {notifications.length > 0 && unreadCount > 0 && (
                          <button
                            onClick={() => void markAllNotificationsRead()}
                            className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => void openNotification(notif)}
                            className={`w-full px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${!notif.read ? "bg-orange-50/30" : ""}`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  notif.type === "warning"
                                    ? "bg-amber-50 text-amber-500"
                                    : notif.type === "success"
                                      ? "bg-emerald-50 text-emerald-500"
                                      : "bg-blue-50 text-blue-500"
                                }`}
                              >
                                {notif.type === "warning" ? (
                                  <AlertTriangle className="w-4 h-4" />
                                ) : notif.type === "success" ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Info className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatRelativeTime(notif.createdAt)}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0" />
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <Bell className="mx-auto h-8 w-8 text-gray-300" />
                          <p className="mt-3 text-sm font-medium text-gray-500">
                            No recent notifications
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            New stock, sales, invoice, and payment activity will
                            appear here.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          router.push("/dashboard/reports");
                        }}
                        className="w-full text-center text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Open reports
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2 hover:bg-gray-50 pl-1 pr-2 py-1 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user?.name ? getInitials(user.name) : "?"}
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200/80 rounded-2xl shadow-xl shadow-gray-200/50 py-1 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {user?.email}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          Profile
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Settings
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {showAiAssistant && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                onClick={() => setShowAiAssistant(false)}
              />
              <aside
                ref={aiPanelRef}
                className={`fixed right-0 z-50 border-l border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:bg-gray-900 dark:border-gray-700 ${
                  aiExpanded
                    ? "top-0 h-screen w-full md:w-[92vw]"
                    : "top-16 h-[calc(100vh-4rem)] w-full sm:w-100"
                }`}
              >
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/20">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        AI Assistant
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Context: {getAiContextLabel(pathname)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowAiHistory((prev) => !prev)}
                      className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Previous Chats"
                    >
                      <History className="mx-auto h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setAiExpanded((prev) => !prev)}
                      className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title={aiExpanded ? "Collapse" : "Expand"}
                    >
                      {aiExpanded ? (
                        <Minimize2 className="mx-auto h-4 w-4" />
                      ) : (
                        <Maximize2 className="mx-auto h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowAiAssistant(false)}
                      className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Close"
                    >
                      <X className="mx-auto h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-gray-400">
                    Quick Prompts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiQuickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => void sendAiMessage(prompt)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-orange-200 hover:text-orange-700"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {showAiHistory && (
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-gray-400">
                      Previous Chats
                    </p>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {aiHistory.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500">
                          No previous chats in this session yet.
                        </div>
                      ) : (
                        aiHistory.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setAiMessageInput(item.prompt);
                              setShowAiHistory(false);
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left hover:border-orange-200 hover:bg-orange-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                                {item.contextLabel}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-medium text-gray-800 line-clamp-1">
                              {item.prompt}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                              {item.reply}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={aiMessagesRef}
                  className="h-[calc(100%-12rem)] overflow-y-auto px-4 py-4 pb-24 space-y-3"
                >
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === "assistant"
                            ? "bg-gray-100 text-slate-900 dark:bg-gray-800 dark:text-gray-100"
                            : "bg-orange-500 text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap wrap-break-word leading-6">
                          {msg.content}
                        </p>
                        {msg.highlights && msg.highlights.length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {msg.highlights.map((highlight) => (
                              <div
                                key={`${msg.id}-${highlight.label}`}
                                className="rounded-xl bg-white/90 px-2.5 py-2 text-xs text-slate-900"
                              >
                                <p className="font-semibold uppercase tracking-wide text-orange-600">
                                  {highlight.label}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {highlight.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.table && msg.table.rows.length > 0 && (
                          <div className="mt-3 overflow-x-auto rounded-xl bg-white p-2 text-slate-800">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                              {msg.table.title}
                            </p>
                            <table className="w-full min-w-65 text-xs">
                              <thead className="bg-orange-500 text-white">
                                <tr>
                                  {msg.table.columns.map((column) => (
                                    <th
                                      key={column}
                                      className="px-2 py-1.5 text-left font-semibold"
                                    >
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.table.rows.map((row, rowIndex) => (
                                  <tr
                                    key={`${msg.id}-row-${rowIndex}`}
                                    className="border-t border-slate-100"
                                  >
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={`${msg.id}-${rowIndex}-${cellIndex}`}
                                        className="px-2 py-1.5 text-slate-600"
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {msg.action && (
                          <div className="mt-2 rounded-lg border border-orange-200 bg-white px-2 py-2 text-xs text-gray-700">
                            <p className="font-medium text-gray-900">
                              {msg.action.label}
                            </p>
                            <p className="mt-0.5 text-gray-500">
                              {msg.action.description}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => void confirmAiAction(msg.id)}
                                className="rounded-md bg-orange-500 px-2.5 py-1 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={
                                  aiSending && aiActionPendingId === msg.id
                                }
                              >
                                {aiSending && aiActionPendingId === msg.id
                                  ? "Confirming..."
                                  : "Confirm"}
                              </button>
                              <button
                                onClick={() => {
                                  router.push(msg.action!.href);
                                  setShowAiAssistant(false);
                                }}
                                className="rounded-md border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-orange-200 hover:text-orange-700"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {aiSending && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI is thinking...
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    <input
                      value={aiMessageInput}
                      onChange={(e) => setAiMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void sendAiMessage();
                        }
                      }}
                      placeholder="Ask anything about your business..."
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-300 focus:outline-none dark:bg-gray-800 dark:border-gray-700"
                    />
                    <button
                      onClick={() => void sendAiMessage()}
                      className="h-10 w-10 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-70"
                      disabled={aiSending}
                      title="Send"
                    >
                      <Send className="mx-auto h-4 w-4" />
                    </button>
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* Page content */}
          <main className="p-4 md:p-6 dark:text-gray-100">
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
