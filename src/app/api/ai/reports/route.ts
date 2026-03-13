import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as {
      type?: "daily" | "weekly" | "custom";
      prompt?: string;
    };

    const reportType = body.type || "daily";
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - (reportType === "daily" ? 1 : 7));

    const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);

    const [sales, expenses, overdueInvoices] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: from, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            date: { $gte: from, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$amount" },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "overdue",
          },
        },
        {
          $group: {
            _id: null,
            overdueCount: { $sum: 1 },
            overdueBalance: { $sum: "$balance" },
          },
        },
      ]),
    ]);

    const revenue = Math.round(sales[0]?.totalRevenue || 0);
    const orders = sales[0]?.orderCount || 0;
    const cost = Math.round(expenses[0]?.totalExpense || 0);
    const overdueCount = overdueInvoices[0]?.overdueCount || 0;
    const overdueBalance = Math.round(overdueInvoices[0]?.overdueBalance || 0);
    const margin =
      revenue > 0 ? Number((((revenue - cost) / revenue) * 100).toFixed(1)) : 0;

    const title =
      reportType === "daily"
        ? "Daily AI Summary"
        : reportType === "weekly"
          ? "Weekly Business Review"
          : "Custom AI Report";

    const lines = [
      `${title} (${from.toLocaleDateString()} - ${now.toLocaleDateString()})`,
      `Revenue: ${revenue.toLocaleString()}`,
      `Orders: ${orders}`,
      `Expenses: ${cost.toLocaleString()}`,
      `Estimated Margin: ${margin}%`,
      `Overdue Invoices: ${overdueCount} (${overdueBalance.toLocaleString()})`,
    ];

    if (reportType === "custom" && body.prompt) {
      lines.push(`Custom focus: ${body.prompt.trim()}`);
    }

    lines.push(
      margin < 20
        ? "Recommendation: Improve margin by adjusting pricing on low-performing SKUs and reducing avoidable expenses."
        : "Recommendation: Maintain current momentum and prioritize high-retention customer campaigns.",
    );

    return apiSuccess({
      type: reportType,
      generatedAt: now.toISOString(),
      report: lines.join("\n"),
      schedules: [
        {
          report: "Daily Summary",
          frequency: "Every day at close of business",
          recipients: ["store_manager", "owner"],
        },
        {
          report: "Weekly Business Review",
          frequency: "Every Monday morning",
          recipients: ["owner", "accountant"],
        },
        {
          report: "Custom AI Report",
          frequency: "On demand or scheduled",
          recipients: ["user_defined"],
        },
        {
          report: "Low Stock Alert",
          frequency: "Real-time trigger",
          recipients: ["warehouse_manager", "store_manager"],
        },
        {
          report: "Overdue Credit Alert",
          frequency: "Daily",
          recipients: ["accountant", "store_manager"],
          overdueCount,
          overdueBalance,
        },
      ],
    });
  } catch (error) {
    console.error("AI reports POST error:", error);
    return apiError("Internal server error", 500);
  }
}
