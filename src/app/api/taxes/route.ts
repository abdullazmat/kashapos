import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);
    const branchObjectId = auth.branchId
      ? new mongoose.Types.ObjectId(auth.branchId)
      : undefined;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const baseQuery = {
      tenantId: tenantObjectId,
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
      ...(branchObjectId ? { branchId: branchObjectId } : {}),
    };

    // Tax summary
    const taxSummary = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          totalTax: { $sum: "$totalTax" },
          totalSubtotal: { $sum: "$subtotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Tax by month
    const taxByMonth = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          totalSales: { $sum: "$total" },
          totalTax: { $sum: "$totalTax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Tax by product (via unwind)
    const taxByProduct = await Sale.aggregate([
      { $match: baseQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          totalSales: { $sum: "$items.total" },
          totalTax: { $sum: "$items.tax" },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalTax: -1 } },
      { $limit: 20 },
    ]);

    // Tax by payment method
    const taxByPaymentMethod = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$paymentMethod",
          totalSales: { $sum: "$total" },
          totalTax: { $sum: "$totalTax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalTax: -1 } },
    ]);

    return apiSuccess({
      summary: taxSummary[0] || {
        totalSales: 0,
        totalTax: 0,
        totalSubtotal: 0,
        count: 0,
      },
      taxByMonth,
      taxByProduct,
      taxByPaymentMethod,
    });
  } catch (error) {
    console.error("Taxes GET error:", error);
    return apiError("Internal server error", 500);
  }
}
