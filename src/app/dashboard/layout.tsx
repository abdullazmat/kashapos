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

const navigation = [
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
    ],
  },
  {
    label: "FINANCE",
    items: [
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Taxes", href: "/dashboard/taxes", icon: Receipt },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Warehouses", href: "/dashboard/warehouses", icon: Warehouse },
      { name: "Integrations", href: "/dashboard/integrations", icon: Plug },
      { name: "Automation", href: "/dashboard/automation", icon: Zap },
      { name: "Templates", href: "/dashboard/templates", icon: FileStack },
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
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // All navigation items flattened for search
  const allNavItems = navigation.flatMap((s) => s.items);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // POS Terminal full-screen mode
  if (pathname === "/dashboard/pos") {
    return (
      <SessionContext.Provider value={{ user, tenant, loading }}>
        {children}
      </SessionContext.Provider>
    );
  }

  return (
    <SessionContext.Provider value={{ user, tenant, loading }}>
      <div className="min-h-screen flex bg-[hsl(220,20%,97%)]">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[hsl(222,47%,11%)] to-[hsl(224,50%,15%)] text-gray-300 flex flex-col transition-all duration-300 z-40 ${
            sidebarCollapsed ? "w-[68px]" : "w-60"
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-white/5">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="ml-3 text-lg font-bold tracking-tight text-white">
                KashaPOS
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
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-teal-500/20 to-emerald-500/10 text-teal-400 shadow-sm shadow-teal-500/5"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-teal-400" : ""}`}
                        />
                        {!sidebarCollapsed && item.name}
                        {isActive && !sidebarCollapsed && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
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
          className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-[68px]" : "ml-60"}`}
        >
          {/* Top bar */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
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
                  className="pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm border border-gray-200/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/30 w-72 transition-colors"
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
                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                            <item.icon className="w-4 h-4 text-teal-600" />
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
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-sm font-medium text-gray-700">
                  {tenant?.name}
                </span>
                <span className="text-[10px] bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  {tenant?.plan}
                </span>
              </div>

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
                            className="text-[10px] font-medium text-teal-600 hover:text-teal-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => void openNotification(notif)}
                            className={`w-full px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${!notif.read ? "bg-teal-50/30" : ""}`}
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
                                <div className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 shrink-0" />
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
                        className="w-full text-center text-xs text-teal-600 hover:text-teal-700 font-medium"
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
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
