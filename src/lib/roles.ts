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

export function getRoleLabel(role: string) {
  return (
    ROLE_LABELS[role] ||
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function getDefaultPermissionsForRole(role: string): ModulePermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || ["dashboard"];
}
