"use client";

import { useMemo, useState, useEffect, useCallback, ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Users,
  Wallet,
  Save,
  Plus,
  Clock,
  Shield,
  Calendar,
  TrendingUp,
  Upload,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  ChevronRight,
  Store,
  Pencil,
} from "lucide-react";
import { CORE_ROLES, ROLE_LABELS, getRoleLabel } from "@/lib/roles";
import { useSession } from "../layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TabKey =
  | "store-profile"
  | "branches-all"
  | "branches-add"
  | "branches-performance"
  | "staff-all"
  | "staff-add"
  | "staff-roles"
  | "staff-shifts"
  | "till-open-close"
  | "till-summary"
  | "till-reconciliation"
  | "settings-hours"
  | "settings-receipt"
  | "settings-loyalty";

interface BranchItem {
  _id: string;
  name: string;
  code: string;
  locationType?: string;
  address?: string;
  phone?: string;
  email?: string;
  isMain?: boolean;
  isActive: boolean;
  capacityUnits?: number;
  notes?: string;
  managerUserId?: { _id: string; name: string; role?: string };
}

interface StaffItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  nationalId?: string;
  employmentType?: string;
  startDate?: string;
  loginPin?: string;
  branchId?: { _id: string; name: string };
}

interface TillSessionItem {
  _id: string;
  tillName: string;
  cashierName: string;
  openingFloat: number;
  closingCashCount: number;
  expectedCash: number;
  variance: number;
  varianceReason?: string;
  closedAt: string;
}

interface TillPreview {
  cashierName: string;
  todayCashSales: number;
  closingTime: string;
  suggestedTillNames: string[];
}

type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
};

const ugandaDistricts = [
  "Kampala",
  "Wakiso",
  "Mukono",
  "Jinja",
  "Mbarara",
  "Gulu",
  "Lira",
  "Mbale",
  "Arua",
  "Masaka",
  "Fort Portal",
  "Hoima",
  "Kabale",
  "Soroti",
  "Entebbe",
];

const countryOptions = ["Uganda", "Kenya", "Tanzania", "Rwanda", "South Sudan"];

const businessTypes = [
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "supermarket", label: "Supermarket" },
  { value: "bakery", label: "Bakery" },
  { value: "other", label: "Other" },
];

const employmentTypes = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const locationTypes = [
  { value: "other", label: "Retail Branch" },
  { value: "warehouse", label: "Warehouse" },
  { value: "store_room", label: "Store Room" },
  { value: "shelf_display", label: "Shelf Display" },
  { value: "cold_storage", label: "Cold Storage" },
  { value: "dispensary", label: "Dispensary" },
];

const navGroups: NavGroup[] = [
  {
    label: "Store Profile",
    icon: Store,
    items: [{ key: "store-profile", label: "Store Profile", icon: Building2 }],
  },
  {
    label: "Branches",
    icon: Building2,
    items: [
      { key: "branches-all", label: "All Branches", icon: Building2 },
      { key: "branches-add", label: "Add Branch", icon: Plus },
      {
        key: "branches-performance",
        label: "Branch Performance",
        icon: TrendingUp,
      },
    ],
  },
  {
    label: "Staff Management",
    icon: Users,
    items: [
      { key: "staff-all", label: "All Staff", icon: Users },
      { key: "staff-add", label: "Add Staff", icon: Plus },
      { key: "staff-roles", label: "Roles & Permissions", icon: Shield },
      { key: "staff-shifts", label: "Shifts & Attendance", icon: Clock },
    ],
  },
  {
    label: "Till & Cash Register",
    icon: Wallet,
    items: [
      { key: "till-open-close", label: "Open/Close Till", icon: Wallet },
      { key: "till-summary", label: "Till Summary", icon: Calendar },
      {
        key: "till-reconciliation",
        label: "Cash Reconciliation",
        icon: FileText,
      },
    ],
  },
  {
    label: "Store Settings",
    icon: Save,
    items: [
      { key: "settings-hours", label: "Operating Hours", icon: Clock },
      {
        key: "settings-receipt",
        label: "Receipt Customization",
        icon: FileText,
      },
      {
        key: "settings-loyalty",
        label: "Loyalty & Promotions",
        icon: TrendingUp,
      },
    ],
  },
];

export default function StoreManagementPage() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const tabParam = (searchParams.get("tab") || "store-profile") as TabKey;
  const allTabs = navGroups.flatMap((group) => group.items);
  const activeTab = allTabs.some((tab) => tab.key === tabParam)
    ? tabParam
    : "store-profile";

  const [storeProfile, setStoreProfile] = useState({
    storeName: "",
    storeLogo: "",
    businessType: "retail",
    tinTaxId: "",
    vatRegistrationNo: "",
    physicalAddress: "",
    district: "",
    country: "Uganda",
    phoneNumber: "",
    emailAddress: "",
    baseCurrency: "UGX",
    receiptFooter: "",
  });

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [tillSessions, setTillSessions] = useState<TillSessionItem[]>([]);
  const [tillPreview, setTillPreview] = useState<TillPreview>({
    cashierName: user?.name || "Cashier",
    todayCashSales: 0,
    closingTime: new Date().toISOString(),
    suggestedTillNames: [],
  });

  const [newStaff, setNewStaff] = useState({
    fullName: "",
    profilePhoto: "",
    phoneNumber: "",
    email: "",
    nationalId: "",
    role: "cashier",
    assignedBranch: "",
    employmentType: "full_time",
    startDate: "",
    loginPin: "",
    password: "",
    isActive: true,
  });
  const [editingStaffId, setEditingStaffId] = useState("");
  const [staffEditor, setStaffEditor] = useState({
    _id: "",
    fullName: "",
    profilePhoto: "",
    phoneNumber: "",
    email: "",
    nationalId: "",
    role: "cashier",
    assignedBranch: "",
    employmentType: "full_time",
    startDate: "",
    loginPin: "",
    password: "",
    isActive: true,
  });
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    locationType: "other",
    managerUserId: "",
    address: "",
    phone: "",
    email: "",
    isMain: false,
    isActive: true,
    capacityUnits: "",
    notes: "",
  });
  const [editingBranchId, setEditingBranchId] = useState("");
  const [branchEditor, setBranchEditor] = useState({
    _id: "",
    name: "",
    code: "",
    locationType: "other",
    managerUserId: "",
    address: "",
    phone: "",
    email: "",
    isMain: false,
    isActive: true,
    capacityUnits: "",
    notes: "",
  });
  const [storeSettings, setStoreSettings] = useState({
    operatingHoursWeekdays: "08:00 - 20:00",
    operatingHoursWeekends: "09:00 - 18:00",
    operatingHoursNotes: "",
    receiptHeader: "",
    receiptFooter: "",
    loyaltyProgramEnabled: false,
    loyaltyPointsRate: "1",
    promotionsEnabled: false,
    promotionMessage: "",
  });

  const [tillForm, setTillForm] = useState({
    tillName: "Main Till 1",
    openingFloat: "",
    closingCashCount: "",
    varianceReason: "",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, branchesRes, staffRes, tillRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/branches"),
        fetch("/api/users"),
        fetch("/api/tills"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const settings = data.settings || {};
        setStoreProfile((prev) => ({
          ...prev,
          storeName: data.name || "",
          storeLogo: data.logo || "",
          businessType: settings.businessType || "retail",
          tinTaxId: settings.tinTaxId || settings.taxNumber || "",
          vatRegistrationNo: settings.vatRegistrationNo || "",
          physicalAddress: settings.physicalAddress || "",
          district: settings.district || "",
          country: settings.country || "Uganda",
          phoneNumber: settings.phoneNumber || "",
          emailAddress: settings.emailAddress || "",
          baseCurrency: settings.currency || "UGX",
          receiptFooter: settings.receiptFooter || "",
        }));
        setStoreSettings((prev) => ({
          ...prev,
          operatingHoursWeekdays:
            settings.operatingHoursWeekdays || "08:00 - 20:00",
          operatingHoursWeekends:
            settings.operatingHoursWeekends || "09:00 - 18:00",
          operatingHoursNotes: settings.operatingHoursNotes || "",
          receiptHeader: settings.receiptHeader || "",
          receiptFooter: settings.receiptFooter || "",
          loyaltyProgramEnabled: Boolean(settings.loyaltyProgramEnabled),
          loyaltyPointsRate: String(settings.loyaltyPointsRate ?? 1),
          promotionsEnabled: Boolean(settings.promotionsEnabled),
          promotionMessage: settings.promotionMessage || "",
        }));
      }

      if (branchesRes.ok) {
        const data = await branchesRes.json();
        setBranches(Array.isArray(data) ? data : []);
      }

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaff(Array.isArray(data) ? data : []);
      }

      if (tillRes.ok) {
        const data = await tillRes.json();
        setTillSessions(data.sessions || []);
        setTillPreview({
          cashierName: data.preview?.cashierName || user?.name || "Cashier",
          todayCashSales: Number(data.preview?.todayCashSales || 0),
          closingTime: data.preview?.closingTime || new Date().toISOString(),
          suggestedTillNames: Array.isArray(data.preview?.suggestedTillNames)
            ? data.preview.suggestedTillNames
            : [],
        });
        setTillForm((prev) => ({
          ...prev,
          tillName:
            prev.tillName ||
            data.preview?.suggestedTillNames?.[0] ||
            "Main Till 1",
        }));
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const activeTabLabel = useMemo(
    () =>
      allTabs.find((tab) => tab.key === activeTab)?.label || "Store Profile",
    [activeTab, allTabs],
  );

  const branchPerformance = useMemo(
    () =>
      branches.map((branch) => ({
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        staffCount: staff.filter(
          (member) => member.branchId?._id === branch._id,
        ).length,
        activeStaffCount: staff.filter(
          (member) => member.branchId?._id === branch._id && member.isActive,
        ).length,
      })),
    [branches, staff],
  );

  const formatMoney = useCallback(
    (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: storeProfile.baseCurrency || "UGX",
        maximumFractionDigits: 0,
      }).format(value || 0),
    [storeProfile.baseCurrency],
  );

  const tillAnalytics = useMemo(() => {
    const totalExpectedCash = tillSessions.reduce(
      (sum, session) => sum + Number(session.expectedCash || 0),
      0,
    );
    const totalCountedCash = tillSessions.reduce(
      (sum, session) => sum + Number(session.closingCashCount || 0),
      0,
    );
    const netVariance = tillSessions.reduce(
      (sum, session) => sum + Number(session.variance || 0),
      0,
    );
    const balancedSessions = tillSessions.filter(
      (session) => session.variance === 0,
    );
    const sessionsNeedingReview = tillSessions.filter(
      (session) => session.variance !== 0,
    );
    const shortageSessions = tillSessions.filter(
      (session) => session.variance < 0,
    );
    const overageSessions = tillSessions.filter(
      (session) => session.variance > 0,
    );

    const groupedByTill = Object.values(
      tillSessions.reduce<
        Record<
          string,
          {
            tillName: string;
            sessions: number;
            expectedCash: number;
            closingCash: number;
            netVariance: number;
            latestClosedAt: string;
          }
        >
      >((acc, session) => {
        const key = session.tillName || "Unknown Till";
        const current = acc[key] || {
          tillName: key,
          sessions: 0,
          expectedCash: 0,
          closingCash: 0,
          netVariance: 0,
          latestClosedAt: session.closedAt,
        };

        current.sessions += 1;
        current.expectedCash += Number(session.expectedCash || 0);
        current.closingCash += Number(session.closingCashCount || 0);
        current.netVariance += Number(session.variance || 0);
        if (new Date(session.closedAt) > new Date(current.latestClosedAt)) {
          current.latestClosedAt = session.closedAt;
        }

        acc[key] = current;
        return acc;
      }, {}),
    ).sort((left, right) => right.sessions - left.sessions);

    return {
      totalSessions: tillSessions.length,
      totalExpectedCash,
      totalCountedCash,
      netVariance,
      balancedSessions,
      sessionsNeedingReview,
      shortageSessions,
      overageSessions,
      latestSession: tillSessions[0],
      groupedByTill,
    };
  }, [tillSessions]);

  const openingFloatValue = Number(tillForm.openingFloat || 0);
  const closingCashValue = Number(tillForm.closingCashCount || 0);
  const expectedCashPreview = openingFloatValue + tillPreview.todayCashSales;
  const variancePreview = closingCashValue - expectedCashPreview;

  const setFeedback = (type: "success" | "error", text: string) => {
    setMessageType(type);
    setMessage(text);
  };

  const handleImageUpload = (
    event: ChangeEvent<HTMLInputElement>,
    onLoad: (value: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onLoad(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveStoreProfile = async () => {
    if (
      storeProfile.phoneNumber &&
      !/^\+256\d{9}$/.test(storeProfile.phoneNumber.trim())
    ) {
      setFeedback("error", "Phone number must use +256XXXXXXXXX format");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: storeProfile.storeName,
          logo: storeProfile.storeLogo,
          currency: storeProfile.baseCurrency,
          receiptFooter: storeProfile.receiptFooter,
          businessType: storeProfile.businessType,
          tinTaxId: storeProfile.tinTaxId,
          vatRegistrationNo: storeProfile.vatRegistrationNo,
          physicalAddress: storeProfile.physicalAddress,
          district: storeProfile.district,
          country: storeProfile.country,
          phoneNumber: storeProfile.phoneNumber,
          emailAddress: storeProfile.emailAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to save store profile");
      } else {
        setFeedback("success", "Store profile saved successfully");
      }
    } catch {
      setFeedback("error", "Failed to save store profile");
    }
    setBusy(false);
  };

  const addStaff = async () => {
    if (!newStaff.fullName || !newStaff.email || !newStaff.password) {
      setFeedback("error", "Name, email, and password are required");
      return;
    }
    if (
      newStaff.phoneNumber &&
      !/^\+256\d{9}$/.test(newStaff.phoneNumber.trim())
    ) {
      setFeedback("error", "Phone number must use +256XXXXXXXXX format");
      return;
    }
    if (newStaff.loginPin && !/^\d{4}$/.test(newStaff.loginPin)) {
      setFeedback("error", "Login PIN must be exactly 4 digits");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaff.fullName,
          email: newStaff.email,
          password: newStaff.password,
          role: newStaff.role,
          branchId: newStaff.assignedBranch || undefined,
          phone: newStaff.phoneNumber,
          nationalId: newStaff.nationalId,
          employmentType: newStaff.employmentType,
          startDate: newStaff.startDate || undefined,
          loginPin: newStaff.loginPin || undefined,
          isActive: newStaff.isActive,
          avatar: newStaff.profilePhoto || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to add staff member");
      } else {
        setFeedback("success", "Staff member added successfully");
        setNewStaff({
          fullName: "",
          profilePhoto: "",
          phoneNumber: "",
          email: "",
          nationalId: "",
          role: "cashier",
          assignedBranch: "",
          employmentType: "full_time",
          startDate: "",
          loginPin: "",
          password: "",
          isActive: true,
        });
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to add staff member");
    }
    setBusy(false);
  };

  const openEditStaff = (member: StaffItem) => {
    setEditingStaffId(member._id);
    setStaffEditor({
      _id: member._id,
      fullName: member.name,
      profilePhoto: member.avatar || "",
      phoneNumber: member.phone || "",
      email: member.email,
      nationalId: member.nationalId || "",
      role: member.role,
      assignedBranch: member.branchId?._id || "",
      employmentType: member.employmentType || "full_time",
      startDate: member.startDate ? String(member.startDate).slice(0, 10) : "",
      loginPin: member.loginPin || "",
      password: "",
      isActive: member.isActive,
    });
  };

  const closeEditStaff = () => {
    setEditingStaffId("");
    setStaffEditor({
      _id: "",
      fullName: "",
      profilePhoto: "",
      phoneNumber: "",
      email: "",
      nationalId: "",
      role: "cashier",
      assignedBranch: "",
      employmentType: "full_time",
      startDate: "",
      loginPin: "",
      password: "",
      isActive: true,
    });
  };

  const openEditBranch = (branch: BranchItem) => {
    setEditingBranchId(branch._id);
    setBranchEditor({
      _id: branch._id,
      name: branch.name,
      code: branch.code,
      locationType: branch.locationType || "other",
      managerUserId: branch.managerUserId?._id || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      isMain: Boolean(branch.isMain),
      isActive: branch.isActive,
      capacityUnits: String(branch.capacityUnits ?? ""),
      notes: branch.notes || "",
    });
  };

  const closeEditBranch = () => {
    setEditingBranchId("");
    setBranchEditor({
      _id: "",
      name: "",
      code: "",
      locationType: "other",
      managerUserId: "",
      address: "",
      phone: "",
      email: "",
      isMain: false,
      isActive: true,
      capacityUnits: "",
      notes: "",
    });
  };

  const saveStaffEdit = async () => {
    if (!staffEditor._id || !staffEditor.fullName || !staffEditor.email) {
      setFeedback("error", "Name and email are required");
      return;
    }
    if (
      staffEditor.phoneNumber &&
      !/^\+256\d{9}$/.test(staffEditor.phoneNumber.trim())
    ) {
      setFeedback("error", "Phone number must use +256XXXXXXXXX format");
      return;
    }
    if (staffEditor.loginPin && !/^\d{4}$/.test(staffEditor.loginPin)) {
      setFeedback("error", "Login PIN must be exactly 4 digits");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: staffEditor._id,
          name: staffEditor.fullName,
          email: staffEditor.email,
          role: staffEditor.role,
          branchId: staffEditor.assignedBranch || "",
          phone: staffEditor.phoneNumber,
          nationalId: staffEditor.nationalId,
          employmentType: staffEditor.employmentType,
          startDate: staffEditor.startDate || "",
          loginPin: staffEditor.loginPin || "",
          isActive: staffEditor.isActive,
          avatar: staffEditor.profilePhoto || "",
          password: staffEditor.password || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to update staff member");
      } else {
        setFeedback("success", "Staff member updated successfully");
        closeEditStaff();
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to update staff member");
    }
    setBusy(false);
  };

  const saveBranchEdit = async () => {
    if (!branchEditor._id || !branchEditor.name.trim()) {
      setFeedback("error", "Branch name is required");
      return;
    }
    if (branchEditor.phone && !/^\+256\d{9}$/.test(branchEditor.phone.trim())) {
      setFeedback("error", "Phone number must use +256XXXXXXXXX format");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: branchEditor._id,
          name: branchEditor.name,
          code: branchEditor.code,
          locationType: branchEditor.locationType,
          managerUserId: branchEditor.managerUserId || undefined,
          address: branchEditor.address,
          phone: branchEditor.phone,
          email: branchEditor.email,
          isMain: branchEditor.isMain,
          isActive: branchEditor.isActive,
          capacityUnits: Number(branchEditor.capacityUnits || 0),
          notes: branchEditor.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to update branch");
      } else {
        setFeedback("success", "Branch updated successfully");
        closeEditBranch();
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to update branch");
    }
    setBusy(false);
  };

  const toggleBranchStatus = async (branch: BranchItem) => {
    setBusy(true);
    setMessage("");
    try {
      const res = branch.isActive
        ? await fetch(`/api/branches?id=${branch._id}`, { method: "DELETE" })
        : await fetch("/api/branches", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: branch._id, isActive: true }),
          });

      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to update branch status");
      } else {
        setFeedback(
          "success",
          `Branch ${branch.isActive ? "deactivated" : "reactivated"}`,
        );
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to update branch status");
    }
    setBusy(false);
  };

  const toggleStaffStatus = async (member: StaffItem) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: member._id, isActive: !member.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to update staff status");
      } else {
        setFeedback(
          "success",
          `Staff member ${member.isActive ? "deactivated" : "reactivated"}`,
        );
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to update staff status");
    }
    setBusy(false);
  };

  const addBranch = async () => {
    if (!branchForm.name.trim()) {
      setFeedback("error", "Branch name is required");
      return;
    }
    if (branchForm.phone && !/^\+256\d{9}$/.test(branchForm.phone.trim())) {
      setFeedback("error", "Phone number must use +256XXXXXXXXX format");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchForm.name,
          code: branchForm.code,
          locationType: branchForm.locationType,
          managerUserId: branchForm.managerUserId || undefined,
          address: branchForm.address,
          phone: branchForm.phone,
          email: branchForm.email,
          isMain: branchForm.isMain,
          isActive: branchForm.isActive,
          capacityUnits: Number(branchForm.capacityUnits || 0),
          notes: branchForm.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to add branch");
      } else {
        setFeedback("success", "Branch added successfully");
        setBranchForm({
          name: "",
          code: "",
          locationType: "other",
          managerUserId: "",
          address: "",
          phone: "",
          email: "",
          isMain: false,
          isActive: true,
          capacityUnits: "",
          notes: "",
        });
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to add branch");
    }
    setBusy(false);
  };

  const saveOperatingHours = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatingHoursWeekdays: storeSettings.operatingHoursWeekdays,
          operatingHoursWeekends: storeSettings.operatingHoursWeekends,
          operatingHoursNotes: storeSettings.operatingHoursNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to save operating hours");
      } else {
        setFeedback("success", "Operating hours saved successfully");
      }
    } catch {
      setFeedback("error", "Failed to save operating hours");
    }
    setBusy(false);
  };

  const saveReceiptCustomization = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptHeader: storeSettings.receiptHeader,
          receiptFooter: storeSettings.receiptFooter,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to save receipt settings");
      } else {
        setStoreProfile((prev) => ({
          ...prev,
          receiptFooter: storeSettings.receiptFooter,
        }));
        setFeedback("success", "Receipt customization saved successfully");
      }
    } catch {
      setFeedback("error", "Failed to save receipt settings");
    }
    setBusy(false);
  };

  const saveLoyaltySettings = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyProgramEnabled: storeSettings.loyaltyProgramEnabled,
          loyaltyPointsRate: Number(storeSettings.loyaltyPointsRate || 0),
          promotionsEnabled: storeSettings.promotionsEnabled,
          promotionMessage: storeSettings.promotionMessage,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to save loyalty settings");
      } else {
        setFeedback(
          "success",
          "Loyalty and promotion settings saved successfully",
        );
      }
    } catch {
      setFeedback("error", "Failed to save loyalty settings");
    }
    setBusy(false);
  };

  const closeTill = async () => {
    if (!tillForm.tillName) {
      setFeedback("error", "Till name is required");
      return;
    }
    if (variancePreview !== 0 && !tillForm.varianceReason.trim()) {
      setFeedback(
        "error",
        "Variance reason is required when variance is not zero",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/tills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tillName: tillForm.tillName,
          openingFloat: openingFloatValue,
          closingCashCount: closingCashValue,
          varianceReason: tillForm.varianceReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback("error", data.error || "Failed to close till");
      } else {
        setFeedback("success", "Till closed and reconciled successfully");
        setTillForm((prev) => ({
          ...prev,
          openingFloat: "",
          closingCashCount: "",
          varianceReason: "",
        }));
        void fetchData();
      }
    } catch {
      setFeedback("error", "Failed to close till");
    }
    setBusy(false);
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-sm text-gray-500">
            Operational configuration under SYSTEM for store profile, branches,
            staff, tills, and store settings.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="space-y-5">
            {navGroups.map((group) => {
              const isGroupActive = group.items.some(
                (item) => item.key === activeTab,
              );
              return (
                <div key={group.label}>
                  <div className="mb-2 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    <group.icon className="h-3.5 w-3.5" />
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((tab) => (
                      <a
                        key={tab.key}
                        href={`/dashboard/store-management?tab=${tab.key}`}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          activeTab === tab.key
                            ? "bg-orange-50 text-orange-700"
                            : isGroupActive
                              ? "text-gray-700 hover:bg-gray-50"
                              : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        <span className="flex-1">{tab.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {activeTabLabel}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === "store-profile" &&
                  "Maintain core store identity and receipt-facing contact details."}
                {activeTab === "staff-add" &&
                  "Create staff accounts with branch assignment, PIN, and employment details."}
                {activeTab === "till-open-close" &&
                  "Close a till with expected cash calculation, variance, and reconciliation reason."}
                {activeTab === "branches-add" &&
                  "Create a new branch or operational location with manager and contact details."}
                {activeTab === "settings-hours" &&
                  "Maintain store operating hours and additional schedule notes."}
                {activeTab === "settings-receipt" &&
                  "Configure receipt header and footer content used at print time."}
                {activeTab === "settings-loyalty" &&
                  "Configure loyalty points and promotion messaging from Store Management."}
                {!["store-profile", "staff-add", "till-open-close"].includes(
                  activeTab,
                ) &&
                  "Review grouped operational configuration inside the Store Management workspace."}
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {messageType === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {message}
              </span>
            </div>
          )}

          {activeTab === "store-profile" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    {storeProfile.storeLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={storeProfile.storeLogo}
                        alt="Store logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Store Logo
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Upload className="h-4 w-4" />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) =>
                            handleImageUpload(event, (value) =>
                              setStoreProfile((prev) => ({
                                ...prev,
                                storeLogo: value,
                              })),
                            )
                          }
                        />
                      </label>
                      {storeProfile.storeLogo && (
                        <button
                          type="button"
                          onClick={() =>
                            setStoreProfile((prev) => ({
                              ...prev,
                              storeLogo: "",
                            }))
                          }
                          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Store Name
                </label>
                <input
                  value={storeProfile.storeName}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      storeName: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. SOLTRUST"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Business Type
                </label>
                <select
                  value={storeProfile.businessType}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      businessType: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {businessTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  TIN (Tax ID)
                </label>
                <input
                  value={storeProfile.tinTaxId}
                  onChange={(e) =>
                    setStoreProfile((p) => ({ ...p, tinTaxId: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  VAT Registration No.
                </label>
                <input
                  value={storeProfile.vatRegistrationNo}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      vatRegistrationNo: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Physical Address
                </label>
                <textarea
                  value={storeProfile.physicalAddress}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      physicalAddress: e.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="e.g. Kampala, Nakasero Road"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  District
                </label>
                <select
                  value={storeProfile.district}
                  onChange={(e) =>
                    setStoreProfile((p) => ({ ...p, district: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Select district</option>
                  {ugandaDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Country
                </label>
                <select
                  value={storeProfile.country}
                  onChange={(e) =>
                    setStoreProfile((p) => ({ ...p, country: e.target.value }))
                  }
                  className={inputClass}
                >
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Phone Number
                </label>
                <input
                  value={storeProfile.phoneNumber}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      phoneNumber: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="+256XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={storeProfile.emailAddress}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      emailAddress: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Base Currency
                </label>
                <select
                  value={storeProfile.baseCurrency}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      baseCurrency: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                  <option value="KES">KES</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Receipt Footer
                </label>
                <textarea
                  value={storeProfile.receiptFooter}
                  onChange={(e) =>
                    setStoreProfile((p) => ({
                      ...p,
                      receiptFooter: e.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="e.g. Thank you for shopping with us!"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={saveStoreProfile}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Store Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === "staff-add" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    {newStaff.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newStaff.profilePhoto}
                        alt="Staff profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Profile Photo
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Upload className="h-4 w-4" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) =>
                            handleImageUpload(event, (value) =>
                              setNewStaff((prev) => ({
                                ...prev,
                                profilePhoto: value,
                              })),
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Full Name
                </label>
                <input
                  value={newStaff.fullName}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, fullName: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Phone Number
                </label>
                <input
                  value={newStaff.phoneNumber}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="+256XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Email
                </label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, email: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  National ID (NIN)
                </label>
                <input
                  value={newStaff.nationalId}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, nationalId: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Role
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, role: e.target.value }))
                  }
                  className={inputClass}
                >
                  {CORE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role] || getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Assigned Branch
                </label>
                <select
                  value={newStaff.assignedBranch}
                  onChange={(e) =>
                    setNewStaff((p) => ({
                      ...p,
                      assignedBranch: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Employment Type
                </label>
                <select
                  value={newStaff.employmentType}
                  onChange={(e) =>
                    setNewStaff((p) => ({
                      ...p,
                      employmentType: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {employmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newStaff.startDate}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Login PIN
                </label>
                <input
                  value={newStaff.loginPin}
                  onChange={(e) =>
                    setNewStaff((p) => ({
                      ...p,
                      loginPin: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className={inputClass}
                  placeholder="4 digits"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Password
                </label>
                <input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, password: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <div className="flex-1 text-sm text-gray-700">Status</div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={newStaff.isActive}
                    onChange={(e) =>
                      setNewStaff((p) => ({ ...p, isActive: e.target.checked }))
                    }
                  />
                  {newStaff.isActive ? "Active" : "Inactive"}
                </label>
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={addStaff}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add Staff
                </button>
              </div>
            </div>
          )}

          {activeTab === "till-open-close" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Till Name
                  </label>
                  <input
                    list="till-name-options"
                    value={tillForm.tillName}
                    onChange={(e) =>
                      setTillForm((p) => ({ ...p, tillName: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="e.g. Main Till 1"
                  />
                  <datalist id="till-name-options">
                    {tillPreview.suggestedTillNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Cashier
                  </label>
                  <input
                    value={tillPreview.cashierName}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Opening Float
                  </label>
                  <input
                    type="number"
                    value={tillForm.openingFloat}
                    onChange={(e) =>
                      setTillForm((p) => ({
                        ...p,
                        openingFloat: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Closing Cash Count
                  </label>
                  <input
                    type="number"
                    value={tillForm.closingCashCount}
                    onChange={(e) =>
                      setTillForm((p) => ({
                        ...p,
                        closingCashCount: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Expected Cash
                  </label>
                  <input
                    value={expectedCashPreview.toLocaleString()}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Variance
                  </label>
                  <input
                    value={`${variancePreview > 0 ? "+" : ""}${variancePreview.toLocaleString()}`}
                    readOnly
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                      variancePreview === 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : variancePreview > 0
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Variance Reason
                  </label>
                  <textarea
                    value={tillForm.varianceReason}
                    onChange={(e) =>
                      setTillForm((p) => ({
                        ...p,
                        varianceReason: e.target.value,
                      }))
                    }
                    rows={3}
                    className={inputClass}
                    placeholder="Required when variance is not zero"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Closing Time
                  </label>
                  <input
                    value={new Date(tillPreview.closingTime).toLocaleString()}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={closeTill}
                    disabled={busy}
                    className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Close Till
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <h3 className="text-sm font-bold text-gray-800">
                  Close Till Preview
                </h3>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">
                    Today Cash Sales
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {tillPreview.todayCashSales.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">
                    Expected Cash
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {expectedCashPreview.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">
                    Variance
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      variancePreview === 0
                        ? "text-emerald-700"
                        : variancePreview > 0
                          ? "text-blue-700"
                          : "text-red-700"
                    }`}
                  >
                    {variancePreview > 0 ? "+" : ""}
                    {variancePreview.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "staff-all" ||
            activeTab === "staff-roles" ||
            activeTab === "staff-shifts") && (
            <div className="mt-5 overflow-x-auto">
              <Dialog
                open={Boolean(editingStaffId)}
                onOpenChange={(open) => !open && closeEditStaff()}
              >
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-0 bg-white p-0">
                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    <DialogHeader className="md:col-span-2">
                      <DialogTitle>Edit Staff Member</DialogTitle>
                      <DialogDescription>
                        Update role, branch assignment, credentials, and staff
                        availability.
                      </DialogDescription>
                    </DialogHeader>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Full Name
                      </label>
                      <input
                        value={staffEditor.fullName}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            fullName: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Phone Number
                      </label>
                      <input
                        value={staffEditor.phoneNumber}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            phoneNumber: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Email
                      </label>
                      <input
                        type="email"
                        value={staffEditor.email}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Role
                      </label>
                      <select
                        value={staffEditor.role}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            role: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {CORE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role] || getRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Assigned Branch
                      </label>
                      <select
                        value={staffEditor.assignedBranch}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            assignedBranch: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Employment Type
                      </label>
                      <select
                        value={staffEditor.employmentType}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            employmentType: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {employmentTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={staffEditor.startDate}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            startDate: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        Login PIN
                      </label>
                      <input
                        value={staffEditor.loginPin}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            loginPin: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className={inputClass}
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={staffEditor.password}
                        onChange={(e) =>
                          setStaffEditor((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="flex-1 text-sm text-gray-700">Status</div>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={staffEditor.isActive}
                          onChange={(e) =>
                            setStaffEditor((p) => ({
                              ...p,
                              isActive: e.target.checked,
                            }))
                          }
                        />
                        {staffEditor.isActive ? "Active" : "Inactive"}
                      </label>
                    </div>
                    <DialogFooter className="md:col-span-2 pt-2">
                      <button
                        type="button"
                        onClick={closeEditStaff}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveStaffEdit}
                        disabled={busy}
                        className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Save Staff Changes
                      </button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left">Staff</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Branch</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member._id} className="border-b">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                            {member.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Users className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{member.email}</td>
                      <td className="px-3 py-2 capitalize">
                        {getRoleLabel(member.role)}
                      </td>
                      <td className="px-3 py-2">
                        {member.branchId?.name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {activeTab === "staff-all" && (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditStaff(member)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleStaffStatus(member)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${member.isActive ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                            >
                              {member.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(activeTab === "branches-all" ||
            activeTab === "branches-performance") && (
            <div className="mt-5 overflow-x-auto">
              {activeTab === "branches-performance" && (
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  {branchPerformance.map((branch) => (
                    <div
                      key={branch._id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {branch.name}
                      </p>
                      <p className="text-xs text-gray-500">{branch.code}</p>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p>Total Staff: {branch.staffCount}</p>
                        <p>Active Staff: {branch.activeStaffCount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left">Branch</th>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Manager</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch._id} className="border-b">
                      <td className="px-3 py-2">{branch.name}</td>
                      <td className="px-3 py-2">{branch.code}</td>
                      <td className="px-3 py-2">
                        {branch.managerUserId?.name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${branch.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {branch.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {activeTab === "branches-all" && (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditBranch(branch)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleBranchStatus(branch)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${branch.isActive ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                            >
                              {branch.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Dialog
            open={Boolean(editingBranchId)}
            onOpenChange={(open) => !open && closeEditBranch()}
          >
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-0 bg-white p-0">
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <DialogHeader className="md:col-span-2">
                  <DialogTitle>Edit Branch</DialogTitle>
                  <DialogDescription>
                    Update branch metadata, manager assignment, and activation
                    state.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Branch Name
                  </label>
                  <input
                    value={branchEditor.name}
                    onChange={(e) =>
                      setBranchEditor((p) => ({ ...p, name: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Code
                  </label>
                  <input
                    value={branchEditor.code}
                    onChange={(e) =>
                      setBranchEditor((p) => ({
                        ...p,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Location Type
                  </label>
                  <select
                    value={branchEditor.locationType}
                    onChange={(e) =>
                      setBranchEditor((p) => ({
                        ...p,
                        locationType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {locationTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Manager
                  </label>
                  <select
                    value={branchEditor.managerUserId}
                    onChange={(e) =>
                      setBranchEditor((p) => ({
                        ...p,
                        managerUserId: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={branchEditor.address}
                    onChange={(e) =>
                      setBranchEditor((p) => ({
                        ...p,
                        address: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Phone
                  </label>
                  <input
                    value={branchEditor.phone}
                    onChange={(e) =>
                      setBranchEditor((p) => ({ ...p, phone: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={branchEditor.email}
                    onChange={(e) =>
                      setBranchEditor((p) => ({ ...p, email: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Capacity Units
                  </label>
                  <input
                    type="number"
                    value={branchEditor.capacityUnits}
                    onChange={(e) =>
                      setBranchEditor((p) => ({
                        ...p,
                        capacityUnits: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={branchEditor.isMain}
                      onChange={(e) =>
                        setBranchEditor((p) => ({
                          ...p,
                          isMain: e.target.checked,
                        }))
                      }
                    />
                    Main Branch
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={branchEditor.isActive}
                      onChange={(e) =>
                        setBranchEditor((p) => ({
                          ...p,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={branchEditor.notes}
                    onChange={(e) =>
                      setBranchEditor((p) => ({ ...p, notes: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <DialogFooter className="md:col-span-2 pt-2">
                  <button
                    type="button"
                    onClick={closeEditBranch}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveBranchEdit}
                    disabled={busy}
                    className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Save Branch Changes
                  </button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {activeTab === "branches-add" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Branch Name
                </label>
                <input
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Code
                </label>
                <input
                  value={branchForm.code}
                  onChange={(e) =>
                    setBranchForm((p) => ({
                      ...p,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className={inputClass}
                  placeholder="Optional auto-generated"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Location Type
                </label>
                <select
                  value={branchForm.locationType}
                  onChange={(e) =>
                    setBranchForm((p) => ({
                      ...p,
                      locationType: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {locationTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Manager
                </label>
                <select
                  value={branchForm.managerUserId}
                  onChange={(e) =>
                    setBranchForm((p) => ({
                      ...p,
                      managerUserId: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Phone
                </label>
                <input
                  value={branchForm.phone}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="+256XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Email
                </label>
                <input
                  type="email"
                  value={branchForm.email}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Capacity Units
                </label>
                <input
                  type="number"
                  value={branchForm.capacityUnits}
                  onChange={(e) =>
                    setBranchForm((p) => ({
                      ...p,
                      capacityUnits: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={branchForm.isMain}
                    onChange={(e) =>
                      setBranchForm((p) => ({ ...p, isMain: e.target.checked }))
                    }
                  />
                  Main Branch
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={branchForm.isActive}
                    onChange={(e) =>
                      setBranchForm((p) => ({
                        ...p,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={branchForm.notes}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={addBranch}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add Branch
                </button>
              </div>
            </div>
          )}

          {activeTab === "till-summary" && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Total Till Sessions
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {tillAnalytics.totalSessions}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Last 30 closed sessions
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Expected Cash
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatMoney(tillAnalytics.totalExpectedCash)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Computed from float + cash sales
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Counted Cash
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatMoney(tillAnalytics.totalCountedCash)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Cash physically counted at close
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Net Variance
                  </p>
                  <p
                    className={`mt-2 text-2xl font-bold ${tillAnalytics.netVariance === 0 ? "text-emerald-700" : tillAnalytics.netVariance > 0 ? "text-blue-700" : "text-red-700"}`}
                  >
                    {tillAnalytics.netVariance > 0 ? "+" : ""}
                    {formatMoney(tillAnalytics.netVariance)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Across all recorded till closures
                  </p>
                </div>
              </div>

              {tillSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">
                    No till sessions recorded yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Close a till from Open/Close Till to populate summary
                    totals, cashier activity, and reconciliation trends.
                  </p>
                  <div className="mt-5 inline-flex rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                    Today&apos;s projected cash sales:{" "}
                    {formatMoney(tillPreview.todayCashSales)}
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                      <h3 className="text-sm font-bold text-gray-800">
                        Recent Till Closures
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="px-3 py-2 text-left">Till</th>
                            <th className="px-3 py-2 text-left">Cashier</th>
                            <th className="px-3 py-2 text-right">Expected</th>
                            <th className="px-3 py-2 text-right">Counted</th>
                            <th className="px-3 py-2 text-right">Variance</th>
                            <th className="px-3 py-2 text-left">Closed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tillSessions.map((session) => (
                            <tr
                              key={session._id}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {session.tillName}
                              </td>
                              <td className="px-3 py-2">
                                {session.cashierName}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatMoney(session.expectedCash)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatMoney(session.closingCashCount)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-semibold ${session.variance === 0 ? "text-emerald-600" : session.variance > 0 ? "text-blue-600" : "text-red-600"}`}
                              >
                                {session.variance > 0 ? "+" : ""}
                                {formatMoney(session.variance)}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {new Date(session.closedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <h3 className="text-sm font-bold text-gray-800">
                        Latest Closure
                      </h3>
                      {tillAnalytics.latestSession ? (
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <p>
                            <span className="font-semibold text-gray-800">
                              Till:
                            </span>{" "}
                            {tillAnalytics.latestSession.tillName}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-800">
                              Cashier:
                            </span>{" "}
                            {tillAnalytics.latestSession.cashierName}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-800">
                              Closed:
                            </span>{" "}
                            {new Date(
                              tillAnalytics.latestSession.closedAt,
                            ).toLocaleString()}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-800">
                              Variance:
                            </span>{" "}
                            {formatMoney(tillAnalytics.latestSession.variance)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <h3 className="text-sm font-bold text-gray-800">
                        Till Performance
                      </h3>
                      <div className="mt-3 space-y-3">
                        {tillAnalytics.groupedByTill.slice(0, 5).map((till) => (
                          <div
                            key={till.tillName}
                            className="rounded-xl border border-gray-100 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {till.tillName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {till.sessions} closure
                                  {till.sessions === 1 ? "" : "s"}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${till.netVariance === 0 ? "bg-emerald-50 text-emerald-700" : till.netVariance > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
                              >
                                {till.netVariance === 0
                                  ? "Balanced"
                                  : till.netVariance > 0
                                    ? "Over"
                                    : "Short"}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                <p>Expected</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">
                                  {formatMoney(till.expectedCash)}
                                </p>
                              </div>
                              <div>
                                <p>Variance</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">
                                  {formatMoney(till.netVariance)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "till-reconciliation" && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Balanced Sessions
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {tillAnalytics.balancedSessions.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Closed with zero variance
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Requires Review
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {tillAnalytics.sessionsNeedingReview.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Sessions with overage or shortage
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Shortages
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-700">
                    {tillAnalytics.shortageSessions.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Negative variances needing explanation
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                    Overages
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-700">
                    {tillAnalytics.overageSessions.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Positive variances above expected cash
                  </p>
                </div>
              </div>

              {tillSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-300" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">
                    No reconciliation records yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Cash reconciliation starts when a till is closed. Use the
                    Open/Close Till tab to record your first closure and
                    variance reason.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                      <h3 className="text-sm font-bold text-gray-800">
                        Reconciliation Log
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="px-3 py-2 text-left">Till</th>
                            <th className="px-3 py-2 text-left">Cashier</th>
                            <th className="px-3 py-2 text-right">Expected</th>
                            <th className="px-3 py-2 text-right">Counted</th>
                            <th className="px-3 py-2 text-right">Variance</th>
                            <th className="px-3 py-2 text-left">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tillSessions.map((session) => (
                            <tr
                              key={session._id}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {session.tillName}
                              </td>
                              <td className="px-3 py-2">
                                {session.cashierName}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatMoney(session.expectedCash)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatMoney(session.closingCashCount)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${session.variance === 0 ? "bg-emerald-50 text-emerald-700" : session.variance > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
                                >
                                  {session.variance > 0 ? "+" : ""}
                                  {formatMoney(session.variance)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {session.varianceReason ||
                                  "No variance recorded"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <h3 className="text-sm font-bold text-gray-800">
                        Review Queue
                      </h3>
                      {tillAnalytics.sessionsNeedingReview.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          All recorded till closures are balanced.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {tillAnalytics.sessionsNeedingReview
                            .slice(0, 6)
                            .map((session) => (
                              <div
                                key={session._id}
                                className="rounded-xl border border-gray-100 bg-white p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {session.tillName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {session.cashierName} •{" "}
                                      {new Date(
                                        session.closedAt,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${session.variance > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
                                  >
                                    {session.variance > 0
                                      ? "Overage"
                                      : "Shortage"}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-gray-800">
                                  Variance: {formatMoney(session.variance)}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {session.varianceReason ||
                                    "Reason not supplied"}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <h3 className="text-sm font-bold text-gray-800">
                        Action Guidance
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        <li>
                          Use shortage results to investigate missing cash,
                          input errors, or delayed postings.
                        </li>
                        <li>
                          Use overage results to identify duplicate entries or
                          unrecorded sales.
                        </li>
                        <li>
                          Record a clear variance reason during till close so
                          reconciliation remains auditable.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings-hours" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Weekday Hours
                </label>
                <input
                  value={storeSettings.operatingHoursWeekdays}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      operatingHoursWeekdays: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="08:00 - 20:00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Weekend Hours
                </label>
                <input
                  value={storeSettings.operatingHoursWeekends}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      operatingHoursWeekends: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="09:00 - 18:00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Operating Notes
                </label>
                <textarea
                  rows={3}
                  value={storeSettings.operatingHoursNotes}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      operatingHoursNotes: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Holiday hours, lunch breaks, or exceptions"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={saveOperatingHours}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Operating Hours
                </button>
              </div>
            </div>
          )}

          {activeTab === "settings-receipt" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Receipt Header
                </label>
                <textarea
                  rows={3}
                  value={storeSettings.receiptHeader}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      receiptHeader: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Appears at the top of printed receipts"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Receipt Footer
                </label>
                <textarea
                  rows={3}
                  value={storeSettings.receiptFooter}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      receiptFooter: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={saveReceiptCustomization}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Receipt Customization
                </button>
              </div>
            </div>
          )}

          {activeTab === "settings-loyalty" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
                <div className="flex-1 text-sm font-medium text-gray-700">
                  Enable Loyalty Program
                </div>
                <input
                  type="checkbox"
                  checked={storeSettings.loyaltyProgramEnabled}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      loyaltyProgramEnabled: e.target.checked,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Points Rate
                </label>
                <input
                  type="number"
                  min={0}
                  value={storeSettings.loyaltyPointsRate}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      loyaltyPointsRate: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Points per qualifying sale"
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 md:col-span-2">
                <div className="flex-1 text-sm font-medium text-gray-700">
                  Enable Promotions
                </div>
                <input
                  type="checkbox"
                  checked={storeSettings.promotionsEnabled}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      promotionsEnabled: e.target.checked,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Promotion Message
                </label>
                <textarea
                  rows={3}
                  value={storeSettings.promotionMessage}
                  onChange={(e) =>
                    setStoreSettings((p) => ({
                      ...p,
                      promotionMessage: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. Earn double points on weekend purchases"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={saveLoyaltySettings}
                  disabled={busy}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Loyalty & Promotions
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">
            Active Branches
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {branches.filter((branch) => branch.isActive).length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">
            Active Staff
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {staff.filter((member) => member.isActive).length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">
            Recent Till Closures
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {tillSessions.length}
          </p>
        </div>
      </div>
    </div>
  );
}
