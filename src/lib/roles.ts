export const CORE_ROLES = [
  "admin",
  "store_manager",
  "warehouse_manager",
  "accountant",
  "cashier",
  "customer_service",
  "inventory_clerk",
  "manager",
] as const;

export type CoreRole = (typeof CORE_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  store_manager: "Store Manager",
  warehouse_manager: "Warehouse Manager",
  accountant: "Accountant",
  cashier: "Cashier",
  customer_service: "Customer Service",
  inventory_clerk: "Inventory Clerk",
  manager: "Manager (Legacy)",
};

export const MODULE_PERMISSIONS = [
  "dashboard",
  "ai",
  "pos",
  "inventory",
  "sales",
  "purchases",
  "customers",
  "suppliers",
  "expenses",
  "invoices",
  "cashflow",
  "taxes",
  "reports",
  "warehouses",
  "settings",
] as const;

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, ModulePermission[]> = {
  admin: [...MODULE_PERMISSIONS],
  store_manager: [
    "dashboard",
    "ai",
    "pos",
    "inventory",
    "sales",
    "purchases",
    "customers",
    "suppliers",
    "expenses",
    "invoices",
    "cashflow",
    "taxes",
    "reports",
    "warehouses",
  ],
  warehouse_manager: [
    "dashboard",
    "ai",
    "inventory",
    "purchases",
    "suppliers",
    "reports",
    "warehouses",
  ],
  accountant: [
    "dashboard",
    "ai",
    "sales",
    "expenses",
    "invoices",
    "cashflow",
    "taxes",
    "reports",
  ],
  cashier: ["dashboard", "ai", "pos", "sales", "customers"],
  customer_service: ["dashboard", "ai", "customers", "sales", "invoices"],
  inventory_clerk: ["dashboard", "ai", "inventory", "purchases", "warehouses"],
  manager: [
    "dashboard",
    "ai",
    "pos",
    "inventory",
    "sales",
    "purchases",
    "customers",
    "suppliers",
    "expenses",
    "invoices",
    "cashflow",
    "taxes",
    "reports",
    "warehouses",
  ],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:
    "Full system access — all modules, settings, finance, reports, user management",
  store_manager:
    "Dashboard, POS Terminal, Sales, Inventory, Customers, Suppliers, Staff Management, Branches, Reports",
  warehouse_manager:
    "Inventory, Warehouse & Storage, Stock, Batches, Returns, Purchases, Suppliers",
  accountant:
    "Finance (Expenses, Invoices, Cash Flow, Fiscal Year, Taxes, Reports), Purchases (view)",
  cashier: "POS Terminal, Sales (own records only), Till & Cash Register",
  customer_service:
    "Customers, Sales (view only), Invoices (view only), Returns",
  inventory_clerk:
    "Inventory, Warehouse & Storage (view + adjust), Stock, Batches, Returns",
  manager:
    "Dashboard, POS Terminal, Sales, Inventory, Customers, Purchases, Reports",
};

export const ROLE_RESTRICTIONS: Record<string, string> = {
  admin: "None",
  store_manager: "Cannot access system settings or delete financial records",
  warehouse_manager: "No access to Finance, Sales reports, or Staff Management",
  accountant: "Cannot edit products, manage staff, or change system settings",
  cashier: "No Finance, no Inventory management, no Staff records",
  customer_service: "Cannot process sales, access Finance, or manage inventory",
  inventory_clerk: "No Finance, no Sales, no Staff Management",
  manager: "Legacy role — configure permissions above",
};

export function getRoleLabel(role: string) {
  return (
    ROLE_LABELS[role] ||
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function getDefaultPermissionsForRole(role: string): ModulePermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || ["dashboard"];
}
