"use client";

import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
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
  Info,
  User,
  RotateCcw,
  Truck,
  Layers,
  Moon,
  Sun,
  Building2,
  Wallet,
  History,
  CreditCard,
  DollarSign,
  Banknote,
  PieChart,
  WifiOff,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

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
  plan: string;
  settings: {
    currency: string;
    taxRate: number;
    receiptHeader?: string;
    receiptFooter?: string;
    lowStockThreshold?: number;
    theme?: string;
    sidebarDefaultCollapsed?: boolean;
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
  children?: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
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
      {
        name: "Customers",
        href: "/dashboard/customers",
        icon: Users,
        children: [
          {
            name: "Customers",
            href: "/dashboard/customers?tab=all",
            icon: Users,
          },
          {
            name: "Add Payment",
            href: "/dashboard/customers?tab=payments&action=add",
            icon: Wallet,
          },
          {
            name: "Payments",
            href: "/dashboard/customers?tab=payments",
            icon: History,
          },
          {
            name: "Customer Balances",
            href: "/dashboard/customers?tab=balances",
            icon: CreditCard,
          },
        ],
      },
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
      { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown },
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
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
      { name: "Taxes", href: "/dashboard/taxes", icon: Receipt },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Stock", href: "/dashboard/stock", icon: Warehouse },
      { name: "Batches", href: "/dashboard/batches", icon: Layers },
      { name: "Returns", href: "/dashboard/returns", icon: RotateCcw },
      { name: "Integrations", href: "/dashboard/integrations", icon: Plug },
      { name: "Automation", href: "/dashboard/automation", icon: Zap },
      { name: "Templates", href: "/dashboard/templates", icon: FileStack },
      { name: "Offline & Desktop", href: "/dashboard/offline", icon: WifiOff },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const applyThemePreference = useCallback((theme: string | undefined) => {
    const useDark = theme === "dark";
    setDarkMode(useDark);
    document.documentElement.classList.toggle("dark", useDark);
    try {
      localStorage.setItem("meka-dark-mode", useDark ? "1" : "0");
    } catch {}
  }, []);

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
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

  // Auto-expand menus whose children match the current path
  useEffect(() => {
    const expanded: string[] = [];
    for (const section of navigation) {
      for (const item of section.items) {
        if (item.children && pathname.startsWith(item.href.split("?")[0])) {
          expanded.push(item.name);
        }
      }
    }
    setExpandedMenus((prev) => {
      const combined = new Set([...prev, ...expanded]);
      return Array.from(combined);
    });
  }, [pathname]);

  // All navigation items flattened for search
  const allNavItems = navigation.flatMap((s) =>
    s.items.flatMap((item) => [item, ...(item.children || [])]),
  );
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
      const res = await fetch("/api/notifications?limit=10", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load notifications");
      }

      const data = (await res.json()) as {
        notifications?: HeaderNotification[];
      };
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
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
          throw new Error("Failed to save notification state");
        }
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
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/sign-in");
        return;
      }
      const data = await res.json();
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
  }, [router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 60000);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications, user]);

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
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[hsl(222,47%,11%)] to-[hsl(224,50%,15%)] text-gray-300 flex flex-col transition-all duration-300 z-40 ${
            sidebarCollapsed ? "w-[68px]" : "w-60"
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-white/5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="ml-3 text-lg font-bold tracking-tight text-white">
                Meka PoS
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-5 px-2 space-y-6">
            {navigation.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500/80">
                    {section.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const basePath = item.href.split("?")[0];
                    const isActive =
                      pathname === basePath ||
                      (basePath !== "/dashboard" &&
                        pathname.startsWith(basePath));
                    const hasChildren =
                      item.children && item.children.length > 0;
                    const isExpanded = expandedMenus.includes(item.name);

                    if (hasChildren) {
                      return (
                        <div key={item.name}>
                          <Link
                            href={basePath}
                            onClick={() => {
                              if (!expandedMenus.includes(item.name))
                                toggleMenu(item.name);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 shadow-sm shadow-orange-500/5"
                                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                            }`}
                            title={sidebarCollapsed ? item.name : undefined}
                          >
                            <item.icon
                              className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-orange-400" : ""}`}
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="flex-1 text-left">
                                  {item.name}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleMenu(item.name);
                                  }}
                                />
                              </>
                            )}
                          </Link>
                          {isExpanded && !sidebarCollapsed && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                              {item.children!.map((child) => {
                                const childBasePath = child.href.split("?")[0];
                                const childQuery = child.href.includes("?")
                                  ? child.href.split("?")[1]
                                  : "";
                                const isChildActive =
                                  pathname === childBasePath &&
                                  (!childQuery ||
                                    (typeof window !== "undefined" &&
                                      window.location.search.includes(
                                        childQuery.split("&")[0],
                                      )));
                                return (
                                  <Link
                                    key={child.name}
                                    href={child.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                                      isChildActive
                                        ? "bg-orange-500/15 text-orange-400"
                                        : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                    }`}
                                  >
                                    <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {child.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 shadow-sm shadow-orange-500/5"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-orange-400" : ""}`}
                        />
                        {!sidebarCollapsed && item.name}
                        {isActive && !sidebarCollapsed && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar footer */}
          {!sidebarCollapsed && (
            <div className="p-3 mx-2 mb-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
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
          className={`content-area flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-[68px]" : "ml-60"}`}
        >
          {/* Top bar */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-30 dark:bg-gray-900/80 dark:border-gray-700/60">
            <div className="flex items-center gap-4">
              {/* Greeting */}
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  {tenant?.businessName && (
                    <>
                      <Building2 className="h-3 w-3" />
                      <span>{tenant.businessName}</span>
                      <span className="text-gray-300 dark:text-gray-600">
                        |
                      </span>
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
                  type="text"
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
                  className="pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm border border-gray-200/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 w-60 lg:w-72 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-750"
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
                <span className="text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
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
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Moon className="w-[18px] h-[18px]" />
                )}
              </button>

              {/* Quick settings for admin */}
              {user?.role === "admin" && (
                <Link
                  href="/dashboard/settings"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  title="Settings"
                >
                  <Settings className="w-[18px] h-[18px]" />
                </Link>
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
                  <Bell className="w-[18px] h-[18px]" />
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
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
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

          {/* Page content */}
          <main className="p-6 dark:text-gray-100">{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
