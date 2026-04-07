import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Expense from "@/models/Expense";
import PurchaseOrder from "@/models/PurchaseOrder";
import CustomerPayment from "@/models/CustomerPayment";
import Return from "@/models/Return";
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

    const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);
    const branchMatch = auth.branchId ? { branchId: new mongoose.Types.ObjectId(auth.branchId) } : {};

    const baseSalesMatch: Record<string, unknown> = {
      tenantId: tenantObjectId,
      status: "completed",
      ...branchMatch,
    };

    const baseExpenseMatch: Record<string, unknown> = {
      tenantId: tenantObjectId,
      ...branchMatch,
    };

    const [
      openingSalesAgg,
      openingExpensesAgg,
      openingPurchasesAgg,
      openingCustomerPaymentsAgg,
      periodSalesAgg,
      periodExpensesAgg,
      periodPurchasesAgg,
      periodCustomerPaymentsAgg,
      openingReturnsAgg,
      periodReturnsAgg,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            ...baseSalesMatch,
            customerId: null,
            createdAt: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
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
      PurchaseOrder.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            ...branchMatch,
            createdAt: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
      ]),
      CustomerPayment.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...baseSalesMatch,
            customerId: null,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
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
      PurchaseOrder.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            ...branchMatch,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
      ]),
      CustomerPayment.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Return.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            ...branchMatch,
            type: "sales_return",
            status: "completed",
            createdAt: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Return.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            ...branchMatch,
            type: "sales_return",
            status: "completed",
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    const openingSales = Number(openingSalesAgg[0]?.total || 0);
    const openingExpenses = Number(openingExpensesAgg[0]?.total || 0);
    const openingPurchases = Number(openingPurchasesAgg[0]?.total || 0);
    const openingCustomerPayments = Number(
      openingCustomerPaymentsAgg[0]?.total || 0,
    );

    const periodSales = Number(periodSalesAgg[0]?.total || 0);
    const periodExpenses = Number(periodExpensesAgg[0]?.total || 0);
    const periodPurchases = Number(periodPurchasesAgg[0]?.total || 0);
    const periodCustomerPayments = Number(
      periodCustomerPaymentsAgg[0]?.total || 0,
    );

    const openingReturns = Number(openingReturnsAgg[0]?.total || 0);
    const periodReturns = Number(periodReturnsAgg[0]?.total || 0);

    const openingBalance =
      openingSales + openingCustomerPayments - openingExpenses - openingPurchases - openingReturns;
    const totalInflows = periodSales + periodCustomerPayments;
    const totalOutflows = periodExpenses + periodPurchases + periodReturns;
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
      const [sales, expenses, purchases, payments, returns] = await Promise.all([
        Sale.find({
          ...baseSalesMatch,
          customerId: null,
          createdAt: { $gte: start, $lte: end },
        })
          .select("_id createdAt orderNumber paymentMethod amountPaid total")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Expense.find({
          ...baseExpenseMatch,
          date: { $gte: start, $lte: end },
        })
          .select("_id date description category amount")
          .sort({ date: -1 })
          .limit(100)
          .lean(),
        PurchaseOrder.find({
          tenantId: tenantObjectId,
          ...branchMatch,
          createdAt: { $gte: start, $lte: end },
          amountPaid: { $gt: 0 },
        })
          .select("_id createdAt orderNumber amountPaid status")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        CustomerPayment.find({
          tenantId: tenantObjectId,
          createdAt: { $gte: start, $lte: end },
        })
          .populate("customerId", "name")
          .sort({ createdAt: -1 })
          .limit(150)
          .lean(),
        Return.find({
          tenantId: tenantObjectId,
          ...branchMatch,
          type: "sales_return",
          status: "completed",
          createdAt: { $gte: start, $lte: end },
        })
          .select("_id createdAt returnNumber total")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);

      const saleInflows = sales.map((sale) => ({
        id: String(sale._id),
        date: new Date(sale.createdAt).toISOString(),
        description: `Sale ${sale.orderNumber} (Cash)`,
        type: sale.paymentMethod || "sale",
        direction: "inflow" as const,
        amount: Number(sale.amountPaid || 0),
      }));

      const paymentInflows = (payments as unknown as Array<{
        _id: string;
        createdAt: string;
        customerId?: { name?: string };
        method?: string;
        amount?: number;
      }>).map((p) => ({
        id: String(p._id),
        date: new Date(p.createdAt).toISOString(),
        description: `Payment from ${p.customerId?.name || "Customer"}`,
        type: p.method || "payment",
        direction: "inflow" as const,
        amount: Number(p.amount || 0),
      }));

      const purchaseOutflows = purchases.map((po) => ({
        id: String(po._id),
        date: new Date(po.createdAt).toISOString(),
        description: `Purchase ${po.orderNumber} (${po.status})`,
        type: "purchase",
        direction: "outflow" as const,
        amount: Number(po.amountPaid || 0),
      }));

      const expenseOutflows = expenses.map((expense) => ({
        id: String(expense._id),
        date: new Date(expense.date).toISOString(),
        description: expense.description || "Expense",
        type: expense.category || "expense",
        direction: "outflow" as const,
        amount: Number(expense.amount || 0),
      }));

      const returnOutflows = (returns as unknown as Array<{
        _id: string;
        createdAt: string;
        returnNumber?: string;
        total?: number;
      }>).map((ret) => ({
        id: String(ret._id),
        date: new Date(ret.createdAt).toISOString(),
        description: `Sales Return ${ret.returnNumber}`,
        type: "refund",
        direction: "outflow" as const,
        amount: Number(ret.total || 0),
      }));

      transactions = [
        ...saleInflows,
        ...paymentInflows,
        ...purchaseOutflows,
        ...expenseOutflows,
        ...returnOutflows,
      ]
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
