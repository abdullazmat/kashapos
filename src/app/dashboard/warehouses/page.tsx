"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  Package,
  Search,
  Warehouse,
} from "lucide-react";

type WarehouseTab = "all" | "add" | "inventory" | "adjustments";

type LocationType =
  | "warehouse"
  | "store_room"
  | "shelf_display"
  | "cold_storage"
  | "dispensary"
  | "other";

type AdjustmentType =
  | "stock_in"
  | "stock_out"
  | "transfer_out"
  | "count_correction"
  | "return_to_supplier";

interface Branch {
  _id: string;
  name: string;
  code: string;
  locationType?: LocationType;
  assignedBranchId?: { _id: string; name: string; code: string };
  managerUserId?: { _id: string; name: string; role: string };
  address: string;
  phone: string;
  email: string;
  capacityUnits?: number;
  notes?: string;
  isMain: boolean;
  isActive: boolean;
}

interface UserItem {
  _id: string;
  name: string;
  role: string;
}

interface StockRow {
  _id: string;
  quantity: number;
  reorderLevel: number;
  productId?: {
    _id: string;
    name: string;
    sku?: string;
    price?: number;
  };
  branchId?: {
    _id: string;
    name: string;
  };
}

interface TransferRow {
  _id: string;
  transferNumber: string;
  status: "pending" | "in_transit" | "received" | "cancelled";
  transferDate: string;
  transportedBy?: string;
  receivedByName?: string;
  notes?: string;
  fromBranchId?: { _id: string; name: string; code: string };
  toBranchId?: { _id: string; name: string; code: string };
  items: {
    productId: string;
    productName: string;
    quantity: number;
    receivedQuantity: number;
  }[];
}

interface AdjustmentRow {
  _id: string;
  type: string;
  quantity: number;
  reason?: string;
  reference?: string;
  branchId?: { _id: string; name: string; code: string };
  productId?: { _id: string; name: string; sku?: string };
  createdAt: string;
}

const LOCATION_TYPES: { label: string; value: LocationType }[] = [
  { label: "Warehouse", value: "warehouse" },
  { label: "Store Room", value: "store_room" },
  { label: "Shelf/Display", value: "shelf_display" },
  { label: "Cold Storage", value: "cold_storage" },
  { label: "Dispensary", value: "dispensary" },
  { label: "Other", value: "other" },
];

const ADJUSTMENT_REASONS = [
  "Purchase received",
  "Damaged",
  "Expired",
  "Internal use",
  "Customer return",
  "Stocktake correction",
  "Supplier return",
];

export default function WarehousesPage() {
  const searchParams = useSearchParams();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [locationForm, setLocationForm] = useState({
    name: "",
    code: "",
    locationType: "warehouse" as LocationType,
    assignedBranchId: "",
    managerUserId: "",
    address: "",
    phone: "",
    email: "",
    capacityUnits: "",
    notes: "",
    isActive: true,
  });

  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [adjustmentForm, setAdjustmentForm] = useState({
    locationId: "",
    productId: "",
    adjustmentType: "stock_in" as AdjustmentType,
    adjustmentQuantity: "",
    newQty: "",
    toLocationId: "",
    reason: ADJUSTMENT_REASONS[0],
    referenceNo: "",
    adjustmentDate: new Date().toISOString().slice(0, 16),
    approvedBy: "",
    notes: "",
  });

  const [transferForm, setTransferForm] = useState({
    fromLocationId: "",
    toLocationId: "",
    productId: "",
    quantity: "",
    transferDate: new Date().toISOString().slice(0, 16),
    transportedBy: "",
    receivedBy: "",
    status: "in_transit",
    notes: "",
  });

  const activeTab = useMemo<WarehouseTab>(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "all" ||
      tab === "add" ||
      tab === "inventory" ||
      tab === "adjustments"
    ) {
      return tab;
    }
    return "all";
  }, [searchParams]);

  const editId = searchParams.get("edit") || "";
  const prefillLocation = searchParams.get("location") || "";
  const prefillProduct = searchParams.get("product") || "";

  const resetLocationForm = useCallback((nextCode?: string) => {
    setLocationForm({
      name: "",
      code: nextCode || "",
      locationType: "warehouse",
      assignedBranchId: "",
      managerUserId: "",
      address: "",
      phone: "",
      email: "",
      capacityUnits: "",
      notes: "",
      isActive: true,
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [branchRes, userRes, stockRes, adjustmentRes, transferRes] =
        await Promise.all([
          fetch("/api/branches"),
          fetch("/api/users"),
          fetch("/api/stock"),
          fetch("/api/stock/adjustments"),
          fetch("/api/stock/transfers"),
        ]);

      if (branchRes.ok) {
        const d = await branchRes.json();
        const list = Array.isArray(d) ? d : d.data || d.branches || [];
        setBranches(list);
        if (!selectedLocationId && list[0]?._id) {
          setSelectedLocationId(list[0]._id);
        }
      }

      if (userRes.ok) {
        const d = await userRes.json();
        const list = Array.isArray(d) ? d : d.data || [];
        setUsers(list);
      }

      if (stockRes.ok) {
        const d = await stockRes.json();
        setStockRows(Array.isArray(d) ? d : d.data || []);
      }

      if (adjustmentRes.ok) {
        const d = await adjustmentRes.json();
        setAdjustments(d.adjustments || []);
      }

      if (transferRes.ok) {
        const d = await transferRes.json();
        setTransfers(d.transfers || []);
      }
    } catch {
      setError("Failed to load warehouse module data");
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  useEffect(() => {
    const nextCode = `LOC-${String(branches.length + 1).padStart(3, "0")}`;
    if (activeTab === "add" && !editId) {
      resetLocationForm(nextCode);
    }
  }, [activeTab, editId, branches.length, resetLocationForm]);

  useEffect(() => {
    if (!editId) return;
    const b = branches.find((row) => row._id === editId);
    if (!b) return;
    setLocationForm({
      name: b.name || "",
      code: b.code || "",
      locationType: b.locationType || "warehouse",
      assignedBranchId: b.assignedBranchId?._id || "",
      managerUserId: b.managerUserId?._id || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      capacityUnits: String(b.capacityUnits || ""),
      notes: b.notes || "",
      isActive: b.isActive,
    });
  }, [editId, branches]);

  useEffect(() => {
    if (!prefillLocation && !prefillProduct) return;
    setAdjustmentForm((prev) => ({
      ...prev,
      locationId: prefillLocation || prev.locationId,
      productId: prefillProduct || prev.productId,
    }));
  }, [prefillLocation, prefillProduct]);

  const managerOptions = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "manager"),
    [users],
  );

  const filteredBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [branches, search],
  );

  const stockByLocation = useMemo(() => {
    const map = new Map<string, { totalItems: number; totalValue: number }>();
    for (const row of stockRows) {
      const bid = row.branchId?._id;
      if (!bid) continue;
      const prev = map.get(bid) || { totalItems: 0, totalValue: 0 };
      prev.totalItems += row.quantity || 0;
      prev.totalValue += (row.quantity || 0) * (row.productId?.price || 0);
      map.set(bid, prev);
    }
    return map;
  }, [stockRows]);

  const inventoryRows = useMemo(() => {
    const byProduct = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        qtyHere: number;
        qtyElsewhere: number;
        totalQty: number;
        minStock: number;
      }
    >();

    for (const row of stockRows) {
      const pid = row.productId?._id;
      if (!pid) continue;
      const existing = byProduct.get(pid) || {
        productId: pid,
        name: row.productId?.name || "Unknown Product",
        sku: row.productId?.sku || "-",
        qtyHere: 0,
        qtyElsewhere: 0,
        totalQty: 0,
        minStock: row.reorderLevel || 0,
      };

      const qty = row.quantity || 0;
      existing.totalQty += qty;
      existing.minStock = row.reorderLevel || existing.minStock;

      if (row.branchId?._id === selectedLocationId) {
        existing.qtyHere += qty;
      } else {
        existing.qtyElsewhere += qty;
      }

      byProduct.set(pid, existing);
    }

    return Array.from(byProduct.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [stockRows, selectedLocationId]);

  const selectedProductCurrentQty = useMemo(() => {
    const row = stockRows.find(
      (s) =>
        s.branchId?._id === adjustmentForm.locationId &&
        s.productId?._id === adjustmentForm.productId,
    );
    return row?.quantity || 0;
  }, [stockRows, adjustmentForm.locationId, adjustmentForm.productId]);

  const computedNewQty = useMemo(() => {
    const qty = Number(adjustmentForm.adjustmentQuantity || 0);
    if (!qty) return selectedProductCurrentQty;
    if (
      adjustmentForm.adjustmentType === "stock_out" ||
      adjustmentForm.adjustmentType === "return_to_supplier" ||
      adjustmentForm.adjustmentType === "transfer_out"
    ) {
      return Math.max(0, selectedProductCurrentQty - qty);
    }
    if (adjustmentForm.adjustmentType === "count_correction") {
      return Number(adjustmentForm.newQty || selectedProductCurrentQty);
    }
    return selectedProductCurrentQty + qty;
  }, [adjustmentForm, selectedProductCurrentQty]);

  const saveLocation = async () => {
    if (!locationForm.name.trim()) {
      setError("Location name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: locationForm.name,
        code: locationForm.code,
        locationType: locationForm.locationType,
        assignedBranchId: locationForm.assignedBranchId || undefined,
        managerUserId: locationForm.managerUserId || undefined,
        address: locationForm.address,
        phone: locationForm.phone,
        email: locationForm.email,
        capacityUnits: Number(locationForm.capacityUnits || 0),
        notes: locationForm.notes,
        isActive: locationForm.isActive,
      };

      const res = await fetch("/api/branches", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { _id: editId, ...payload } : payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save location");
        return;
      }

      setSuccess(editId ? "Location updated" : "Location created");
      await fetchData();
      if (!editId) {
        const nextCode = `LOC-${String(branches.length + 2).padStart(3, "0")}`;
        resetLocationForm(nextCode);
      }
    } catch {
      setError("Failed to save location");
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateLocation = async (id: string) => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to deactivate location");
      } else {
        setSuccess("Location deactivated");
        await fetchData();
      }
    } catch {
      setError("Failed to deactivate location");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjustment = async () => {
    const qty = Number(adjustmentForm.adjustmentQuantity || 0);
    if (!adjustmentForm.locationId || !adjustmentForm.productId || qty <= 0) {
      setError("Location, product and adjustment quantity are required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (adjustmentForm.adjustmentType === "transfer_out") {
        if (!adjustmentForm.toLocationId) {
          setError("Destination location is required for transfer out");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/stock/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromBranchId: adjustmentForm.locationId,
            toBranchId: adjustmentForm.toLocationId,
            productId: adjustmentForm.productId,
            quantity: qty,
            transferDate: adjustmentForm.adjustmentDate,
            transportedBy: transferForm.transportedBy,
            receivedByName: transferForm.receivedBy,
            notes: adjustmentForm.notes || adjustmentForm.reason,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to create transfer");
        } else {
          setSuccess("Transfer out recorded as in transit");
          await fetchData();
        }
      } else {
        const res = await fetch("/api/stock/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId: adjustmentForm.locationId,
            productId: adjustmentForm.productId,
            adjustmentType: adjustmentForm.adjustmentType,
            quantity: qty,
            newQty:
              adjustmentForm.adjustmentType === "count_correction"
                ? Number(adjustmentForm.newQty || selectedProductCurrentQty)
                : undefined,
            reason: adjustmentForm.reason,
            reference: adjustmentForm.referenceNo,
            approvedBy: adjustmentForm.approvedBy,
            adjustmentDate: adjustmentForm.adjustmentDate,
            notes: adjustmentForm.notes,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to post adjustment");
        } else {
          setSuccess("Stock adjustment posted successfully");
          await fetchData();
        }
      }
    } catch {
      setError("Failed to post adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    const qty = Number(transferForm.quantity || 0);
    if (
      !transferForm.fromLocationId ||
      !transferForm.toLocationId ||
      !transferForm.productId ||
      qty <= 0
    ) {
      setError("From, to, product and quantity are required for transfer");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/stock/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId: transferForm.fromLocationId,
          toBranchId: transferForm.toLocationId,
          productId: transferForm.productId,
          quantity: qty,
          transferDate: transferForm.transferDate,
          transportedBy: transferForm.transportedBy,
          receivedByName: transferForm.receivedBy,
          notes: transferForm.notes,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create transfer");
      } else {
        setSuccess("Transfer created and source stock deducted");
        await fetchData();
      }
    } catch {
      setError("Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const receiveTransfer = async (id: string) => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/stock/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          receivedByName: "Store Staff",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to receive transfer");
      } else {
        setSuccess("Transfer marked as received and destination stock updated");
        await fetchData();
      }
    } catch {
      setError("Failed to receive transfer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Warehouse &amp; Storage
            </h1>
            <p className="text-sm text-gray-500">
              Multi-location inventory, adjustments, and transfer controls
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-2">
        {[
          { key: "all", label: "All Locations" },
          { key: "add", label: editId ? "Edit Location" : "Add Location" },
          { key: "inventory", label: "Location Inventory" },
          { key: "adjustments", label: "Stock Adjustments" },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`/dashboard/warehouses?tab=${tab.key}`}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-orange-50 text-orange-700"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {branches.length}
              </p>
              <p className="text-[13px] text-gray-400">Total Locations</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {branches.filter((b) => b.isActive).length}
              </p>
              <p className="text-[13px] text-gray-400">Active Locations</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {stockRows.reduce((a, r) => a + (r.quantity || 0), 0)}
              </p>
              <p className="text-[13px] text-gray-400">
                Total Qty Across Locations
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
        </div>
      ) : null}

      {!loading && activeTab === "all" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locations..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredBranches.map((branch) => {
              const summary = stockByLocation.get(branch._id) || {
                totalItems: 0,
                totalValue: 0,
              };
              return (
                <div
                  key={branch._id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {branch.name}
                      </h3>
                      <p className="text-xs text-gray-500">{branch.code}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        branch.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      Type:{" "}
                      {(branch.locationType || "warehouse").replace("_", " ")}
                    </p>
                    <p>
                      Assigned Branch: {branch.assignedBranchId?.name || "-"}
                    </p>
                    <p>Manager: {branch.managerUserId?.name || "-"}</p>
                    <p>Qty: {summary.totalItems.toLocaleString()}</p>
                    <p>Value: UGX {summary.totalValue.toLocaleString()}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={`/dashboard/warehouses?tab=add&edit=${branch._id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </a>
                    {!branch.isMain && (
                      <button
                        onClick={() => void deactivateLocation(branch._id)}
                        disabled={submitting}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && activeTab === "add" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {editId ? "Edit Location" : "Add Location"}
          </h2>
          <p className="mb-5 mt-1 text-sm text-gray-500">
            Create or update a storage location with branch assignment and
            manager ownership.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Location Name
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.name}
                onChange={(e) =>
                  setLocationForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Location Code (auto)
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                value={locationForm.code}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Location Type
              </label>
              <select
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.locationType}
                onChange={(e) =>
                  setLocationForm((p) => ({
                    ...p,
                    locationType: e.target.value as LocationType,
                  }))
                }
              >
                {LOCATION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Assigned Branch
              </label>
              <select
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.assignedBranchId}
                onChange={(e) =>
                  setLocationForm((p) => ({
                    ...p,
                    assignedBranchId: e.target.value,
                  }))
                }
              >
                <option value="">Select branch</option>
                {branches
                  .filter((b) => b._id !== editId)
                  .map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Location Manager
              </label>
              <select
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.managerUserId}
                onChange={(e) =>
                  setLocationForm((p) => ({
                    ...p,
                    managerUserId: e.target.value,
                  }))
                }
              >
                <option value="">Select manager</option>
                {managerOptions.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Capacity (units)
              </label>
              <input
                type="number"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.capacityUnits}
                onChange={(e) =>
                  setLocationForm((p) => ({
                    ...p,
                    capacityUnits: e.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Physical Address
              </label>
              <textarea
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.address}
                onChange={(e) =>
                  setLocationForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Phone
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.phone}
                onChange={(e) =>
                  setLocationForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Email
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.email}
                onChange={(e) =>
                  setLocationForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Notes
              </label>
              <textarea
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={locationForm.notes}
                onChange={(e) =>
                  setLocationForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <button
                type="button"
                onClick={() =>
                  setLocationForm((p) => ({ ...p, isActive: !p.isActive }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  locationForm.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {locationForm.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <a
              href="/dashboard/warehouses?tab=all"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700"
            >
              Back
            </a>
            <button
              onClick={() => void saveLocation()}
              disabled={submitting}
              className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : editId
                  ? "Update Location"
                  : "Create Location"}
            </button>
          </div>
        </div>
      )}

      {!loading && activeTab === "inventory" && (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="max-w-sm">
            <label className="text-xs font-semibold uppercase text-gray-400">
              Location Selector
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-600 text-white">
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-right">Qty Here</th>
                  <th className="px-3 py-2 text-right">Qty Elsewhere</th>
                  <th className="px-3 py-2 text-right">Total Qty</th>
                  <th className="px-3 py-2 text-right">Min Stock</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((row) => {
                  const status =
                    row.qtyHere <= 0
                      ? "Out of Stock"
                      : row.qtyHere <= row.minStock
                        ? "Low Stock"
                        : "Active";
                  return (
                    <tr key={row.productId} className="border-b">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.sku}</td>
                      <td className="px-3 py-2 text-right">{row.qtyHere}</td>
                      <td className="px-3 py-2 text-right">
                        {row.qtyElsewhere}
                      </td>
                      <td className="px-3 py-2 text-right">{row.totalQty}</td>
                      <td className="px-3 py-2 text-right">{row.minStock}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">
                        <a
                          href={`/dashboard/warehouses?tab=adjustments&location=${selectedLocationId}&product=${row.productId}`}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Adjust / Transfer
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "adjustments" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Stock Adjustment Form
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Location
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.locationId}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      locationId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select location</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Product
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.productId}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      productId: e.target.value,
                    }))
                  }
                >
                  <option value="">Search/select product</option>
                  {inventoryRows.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Current Qty
                </label>
                <input
                  readOnly
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  value={selectedProductCurrentQty}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Adjustment Type
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.adjustmentType}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      adjustmentType: e.target.value as AdjustmentType,
                    }))
                  }
                >
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="count_correction">Count Correction</option>
                  <option value="return_to_supplier">Return To Supplier</option>
                </select>
              </div>

              {adjustmentForm.adjustmentType === "transfer_out" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    To Location
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    value={adjustmentForm.toLocationId}
                    onChange={(e) =>
                      setAdjustmentForm((p) => ({
                        ...p,
                        toLocationId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select destination</option>
                    {branches
                      .filter((b) => b._id !== adjustmentForm.locationId)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Adjustment Quantity
                </label>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.adjustmentQuantity}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      adjustmentQuantity: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  New Qty
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  value={computedNewQty}
                  readOnly={
                    adjustmentForm.adjustmentType !== "count_correction"
                  }
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({ ...p, newQty: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Reason
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({ ...p, reason: e.target.value }))
                  }
                >
                  {ADJUSTMENT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Reference No.
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.referenceNo}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      referenceNo: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Date
                </label>
                <input
                  type="datetime-local"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.adjustmentDate}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      adjustmentDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Approved By
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.approvedBy}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({
                      ...p,
                      approvedBy: e.target.value,
                    }))
                  }
                >
                  <option value="">Select approver</option>
                  {managerOptions.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Notes
                </label>
                <textarea
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={adjustmentForm.notes}
                  onChange={(e) =>
                    setAdjustmentForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <button
              onClick={() => void submitAdjustment()}
              disabled={submitting}
              className="mt-4 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save Adjustment
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Transfer Between Locations
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Transfer out deducts source immediately and creates an in-transit
              record.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  From Location
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.fromLocationId}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      fromLocationId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select source</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  To Location
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.toLocationId}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      toLocationId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select destination</option>
                  {branches
                    .filter((b) => b._id !== transferForm.fromLocationId)
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Product
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.productId}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      productId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select product</option>
                  {inventoryRows.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Transfer Quantity
                </label>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.quantity}
                  onChange={(e) =>
                    setTransferForm((p) => ({ ...p, quantity: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Transfer Date
                </label>
                <input
                  type="datetime-local"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.transferDate}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      transferDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Transported By
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.transportedBy}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      transportedBy: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Received By
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.receivedBy}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      receivedBy: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Notes
                </label>
                <textarea
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={transferForm.notes}
                  onChange={(e) =>
                    setTransferForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <button
              onClick={() => void submitTransfer()}
              disabled={submitting}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create Transfer
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Recent Transfers
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">From</th>
                    <th className="px-3 py-2">To</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t._id} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        {t.transferNumber}
                      </td>
                      <td className="px-3 py-2">
                        {t.fromBranchId?.name || "-"}
                      </td>
                      <td className="px-3 py-2">{t.toBranchId?.name || "-"}</td>
                      <td className="px-3 py-2">
                        {t.items[0]?.productName || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.items[0]?.quantity || 0}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {t.status.replace("_", " ")}
                      </td>
                      <td className="px-3 py-2">
                        {t.status === "in_transit" ? (
                          <button
                            onClick={() => void receiveTransfer(t._id)}
                            disabled={submitting}
                            className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark Received
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Recent Adjustments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a._id} className="border-b">
                      <td className="px-3 py-2">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{a.branchId?.name || "-"}</td>
                      <td className="px-3 py-2">{a.productId?.name || "-"}</td>
                      <td className="px-3 py-2">{a.type.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-right">{a.quantity}</td>
                      <td className="px-3 py-2">{a.reference || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
            <h3 className="text-base font-semibold text-orange-800">
              How Warehouse &amp; Storage Connects to Other Modules
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-600 text-white">
                    <th className="px-3 py-2 text-left">Module</th>
                    <th className="px-3 py-2 text-left">Connection</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Inventory",
                      "Total qty is aggregated across locations with per-location breakdown.",
                    ],
                    [
                      "POS Terminal",
                      "Sales deduct from the branch/location stock assigned to the till.",
                    ],
                    [
                      "Purchases",
                      "Receiving stock can target a specific location.",
                    ],
                    [
                      "Returns",
                      "Return-to-location increases stock in the selected location.",
                    ],
                    [
                      "Batches",
                      "Expiry and batch tracking can be location-aware.",
                    ],
                    [
                      "Stock",
                      "Reorder and stock levels can be reviewed by location.",
                    ],
                    [
                      "Reports",
                      "Reports can filter stock value, movement, and shrinkage by location.",
                    ],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-orange-100">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row[0]}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
