import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Expense from "@/models/Expense";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

function getDateRange(period: PeriodKey, startDate?: string, endDate?: string) {
  const now = new Date();

  if (period === "custom") {
    const start = startDate
      ? new Date(`${startDate}T00:00:00.000Z`)
      : new Date(now);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(now);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid date range");
    }
    if (start > end) {
      throw new Error("Start date cannot be after end date");
    }

    return { start, end };
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);

    const periodParam = (searchParams.get("period") || "today") as PeriodKey;
    const period: PeriodKey = [
      "today",
      "week",
      "month",
      "year",
      "custom",
    ].includes(periodParam)
      ? periodParam
      : "today";
    const startDateParam = searchParams.get("startDate") || undefined;
    const endDateParam = searchParams.get("endDate") || undefined;
    const includeDetails = searchParams.get("includeDetails") !== "false";

    const { start, end } = getDateRange(period, startDateParam, endDateParam);

    const branchMatch = auth.branchId ? { branchId: auth.branchId } : {};

    const baseSalesMatch: Record<string, unknown> = {
      tenantId: auth.tenantId,
      status: "completed",
      ...branchMatch,
    };

    const baseExpenseMatch: Record<string, unknown> = {
      tenantId: auth.tenantId,
      ...branchMatch,
    };

    const [
      openingSalesAgg,
      openingExpensesAgg,
      periodSalesAgg,
      periodExpensesAgg,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            ...baseSalesMatch,
            createdAt: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...baseExpenseMatch,
            date: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...baseSalesMatch,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...baseExpenseMatch,
            date: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const openingSales = Number(openingSalesAgg[0]?.total || 0);
    const openingExpenses = Number(openingExpensesAgg[0]?.total || 0);
    const totalInflows = Number(periodSalesAgg[0]?.total || 0);
    const totalOutflows = Number(periodExpensesAgg[0]?.total || 0);

    const openingBalance = openingSales - openingExpenses;
    const netCashFlow = totalInflows - totalOutflows;
    const closingBalance = openingBalance + netCashFlow;

    let transactions: Array<{
      id: string;
      date: string;
      description: string;
      type: string;
      direction: "inflow" | "outflow";
      amount: number;
    }> = [];

    if (includeDetails) {
      const [sales, expenses] = await Promise.all([
        Sale.find({
          ...baseSalesMatch,
          createdAt: { $gte: start, $lte: end },
        })
          .select("_id createdAt orderNumber paymentMethod total")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        Expense.find({
          ...baseExpenseMatch,
          date: { $gte: start, $lte: end },
        })
          .select("_id date description category amount")
          .sort({ date: -1 })
          .limit(200)
          .lean(),
      ]);

      const inflows = sales.map((sale) => ({
        id: String(sale._id),
        date: new Date(sale.createdAt).toISOString(),
        description: `Sale ${sale.orderNumber}`,
        type: sale.paymentMethod || "sale",
        direction: "inflow" as const,
        amount: Number(sale.total || 0),
      }));

      const outflows = expenses.map((expense) => ({
        id: String(expense._id),
        date: new Date(expense.date).toISOString(),
        description: expense.description || "Expense",
        type: expense.category || "expense",
        direction: "outflow" as const,
        amount: Number(expense.amount || 0),
      }));

      transactions = [...inflows, ...outflows]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 250);
    }

    return apiSuccess({
      period,
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
      includeDetails,
      openingBalance,
      totalInflows,
      totalOutflows,
      netCashFlow,
      closingBalance,
      transactions,
    });
  } catch (error) {
    console.error("Cashflow GET error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
