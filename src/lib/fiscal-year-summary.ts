import FiscalYear from "@/models/FiscalYear";
import Sale from "@/models/Sale";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";

export type FiscalYearSummaryRow = {
  month: string;
  revenue: number;
  expenses: number;
};

export type FiscalYearCategoryRow = {
  category: string;
  revenue: number;
};

export type FiscalSummaryData = {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  vatCollected: number;
  outstandingInvoices: { count: number; total: number };
  monthlyRevenueVsExpenses: FiscalYearSummaryRow[];
  topProductCategories: FiscalYearCategoryRow[];
};

function buildDateRange(startDate: Date, endDate: Date) {
  return { $gte: startDate, $lte: endDate };
}

export async function getFiscalYearSummaryData({
  tenantId,
  fiscalYearId,
  branchId,
}: {
  tenantId: string;
  fiscalYearId?: string | null;
  branchId?: string | null;
}) {
  const fiscalYears = await FiscalYear.find({ tenantId })
    .sort({ startDate: -1 })
    .lean();

  if (fiscalYears.length === 0) {
    return {
      fiscalYears: [],
      selectedFiscalYearId: null,
      summary: null,
    };
  }

  const selectedFiscalYear =
    (fiscalYearId
      ? fiscalYears.find((row) => String(row._id) === fiscalYearId)
      : undefined) ||
    fiscalYears.find((row) => row.status === "active") ||
    fiscalYears[0];

  const range = buildDateRange(
    new Date(selectedFiscalYear.startDate),
    new Date(selectedFiscalYear.endDate),
  );

  const salesMatch: Record<string, unknown> = {
    tenantId,
    status: { $in: ["completed", "pending"] },
    createdAt: range,
  };
  const expenseMatch: Record<string, unknown> = {
    tenantId,
    date: range,
  };
  const invoiceMatch: Record<string, unknown> = {
    tenantId,
    status: { $nin: ["paid", "cancelled"] },
    balance: { $gt: 0 },
    createdAt: range,
  };

  if (branchId) {
    salesMatch.branchId = branchId;
    expenseMatch.branchId = branchId;
  }

  const [
    salesAgg,
    expensesAgg,
    monthlySalesRows,
    monthlyExpenseRows,
    outstandingInvoiceAgg,
    vatCollectedAgg,
    topCategories,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
        },
      },
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          expenses: { $sum: "$amount" },
        },
      },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          expenses: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$balance" },
        },
      },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      { $group: { _id: null, totalVat: { $sum: "$totalTax" } } },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          revenue: { $sum: "$items.total" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const monthlyMap = new Map<string, FiscalYearSummaryRow>();
  for (const row of monthlySalesRows) {
    monthlyMap.set(row._id, {
      month: row._id,
      revenue: Number(row.revenue || 0),
      expenses: 0,
    });
  }
  for (const row of monthlyExpenseRows) {
    const existing = monthlyMap.get(row._id);
    if (existing) {
      existing.expenses = Number(row.expenses || 0);
      continue;
    }
    monthlyMap.set(row._id, {
      month: row._id,
      revenue: 0,
      expenses: Number(row.expenses || 0),
    });
  }

  const totalRevenue = Number(salesAgg[0]?.revenue || 0);
  const totalExpenses = Number(expensesAgg[0]?.expenses || 0);
  const grossProfit = totalRevenue - totalExpenses;

  return {
    fiscalYears,
    selectedFiscalYearId: String(selectedFiscalYear._id),
    summary: {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit: grossProfit,
      vatCollected: Number(vatCollectedAgg[0]?.totalVat || 0),
      outstandingInvoices: {
        count: Number(outstandingInvoiceAgg[0]?.count || 0),
        total: Number(outstandingInvoiceAgg[0]?.total || 0),
      },
      monthlyRevenueVsExpenses: Array.from(monthlyMap.values()).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      topProductCategories: topCategories.map((row) => ({
        category: String(row._id || "Uncategorised"),
        revenue: Number(row.revenue || 0),
      })),
    },
  };
}
