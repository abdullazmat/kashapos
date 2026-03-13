import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import FiscalYear from "@/models/FiscalYear";
import Sale from "@/models/Sale";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

function buildDateRange(startDate: Date, endDate: Date) {
  return { $gte: startDate, $lte: endDate };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const selectedFiscalYearId = searchParams.get("fiscalYearId");

    const fiscalYears = await FiscalYear.find({ tenantId: auth.tenantId })
      .sort({ startDate: -1 })
      .lean();

    if (fiscalYears.length === 0) {
      return apiSuccess({
        fiscalYears: [],
        selectedFiscalYearId: null,
        summary: null,
      });
    }

    const selectedFiscalYear =
      (selectedFiscalYearId
        ? fiscalYears.find((row) => String(row._id) === selectedFiscalYearId)
        : undefined) ||
      fiscalYears.find((row) => row.status === "active") ||
      fiscalYears[0];

    const range = buildDateRange(
      new Date(selectedFiscalYear.startDate),
      new Date(selectedFiscalYear.endDate),
    );

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
        {
          $match: {
            tenantId: auth.tenantId,
            status: { $in: ["completed", "pending"] },
            createdAt: range,
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            tax: { $sum: "$totalTax" },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            date: range,
          },
        },
        {
          $group: {
            _id: null,
            expenses: { $sum: "$amount" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            status: { $in: ["completed", "pending"] },
            createdAt: range,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Expense.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            date: range,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            expenses: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            status: { $nin: ["paid", "cancelled"] },
            balance: { $gt: 0 },
            createdAt: range,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$balance" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            status: { $in: ["completed", "pending"] },
            createdAt: range,
          },
        },
        { $group: { _id: null, totalVat: { $sum: "$totalTax" } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            status: { $in: ["completed", "pending"] },
            createdAt: range,
          },
        },
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

    const totalRevenue = salesAgg[0]?.revenue || 0;
    const totalExpenses = expensesAgg[0]?.expenses || 0;
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit;

    return apiSuccess({
      fiscalYears,
      selectedFiscalYearId: String(selectedFiscalYear._id),
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        netProfit,
        vatCollected: vatCollectedAgg[0]?.totalVat || 0,
        outstandingInvoices: {
          count: outstandingInvoiceAgg[0]?.count || 0,
          total: outstandingInvoiceAgg[0]?.total || 0,
        },
        monthlyRevenueVsExpenses: monthlySalesRows.map((row) => {
          const expenseRow = monthlyExpenseRows.find(
            (exp) => exp._id === row._id,
          );
          return {
            month: row._id,
            revenue: row.revenue,
            expenses: expenseRow?.expenses || 0,
          };
        }),
        topProductCategories: topCategories.map((row) => ({
          category: row._id,
          revenue: row.revenue,
        })),
      },
    });
  } catch (error) {
    console.error("Fiscal years GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const label = String(body.label || "").trim();
    const cycle =
      body.cycle === "calendar_jan_dec" || body.cycle === "custom"
        ? body.cycle
        : "ura_jul_jun";
    const startDate = new Date(String(body.startDate || ""));
    const endDate = new Date(String(body.endDate || ""));

    if (
      !label ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return apiError("Label, start date, and end date are required", 400);
    }

    if (startDate >= endDate) {
      return apiError("End date must be after start date", 400);
    }

    if (body.setActive === true) {
      await FiscalYear.updateMany(
        { tenantId: auth.tenantId, status: "active" },
        { $set: { status: "closed" } },
      );
    }

    const fiscalYear = await FiscalYear.create({
      tenantId: auth.tenantId,
      label,
      startDate,
      endDate,
      cycle,
      status: body.setActive === true ? "active" : "closed",
      createdBy: auth.userId || undefined,
    });

    return apiSuccess({ fiscalYear }, 201);
  } catch (error) {
    console.error("Fiscal years POST error:", error);
    return apiError(
      error instanceof Error && error.message.includes("duplicate")
        ? "Fiscal year label already exists"
        : "Internal server error",
      error instanceof Error && error.message.includes("duplicate") ? 409 : 500,
    );
  }
}
