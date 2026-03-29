import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Return from "@/models/Return";
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
    const period = searchParams.get("period") || "today";

    let startDate: Date;
    const endDate = new Date();
    let salesGroupFormat = "%Y-%m-%d";

    switch (period) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        salesGroupFormat = "%Y-%m-%d %H:00";
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        salesGroupFormat = "%Y-%m-%d";
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        salesGroupFormat = "%Y-%m-%d";
        break;
      case "quarter":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        salesGroupFormat = "%Y-%U";
        break;
      case "half":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        salesGroupFormat = "%Y-%m";
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        salesGroupFormat = "%Y-%m";
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        salesGroupFormat = "%Y-%m-%d %H:00";
    }

    const tenantQuery = { tenantId: auth.tenantId };
    const aggregateTenantQuery = { tenantId: tenantObjectId };
    const salesQuery = auth.branchId
      ? { tenantId: auth.tenantId, branchId: auth.branchId }
      : tenantQuery;
    const aggregateSalesQuery = branchObjectId
      ? { tenantId: tenantObjectId, branchId: branchObjectId }
      : aggregateTenantQuery;
    const stockQuery = auth.branchId
      ? { tenantId: auth.tenantId, branchId: auth.branchId }
      : tenantQuery;
    const aggregateStockQuery = branchObjectId
      ? { tenantId: tenantObjectId, branchId: branchObjectId }
      : aggregateTenantQuery;

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      todaySales,
      yesterdaySales,
      todayOrders,
      yesterdayOrders,
      totalStock,
      totalCustomers,
      weeklySales,
      todayReturns,
      yesterdayReturns,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            ...aggregateSalesQuery,
            createdAt: { $gte: todayStart },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...aggregateSalesQuery,
            createdAt: { $gte: yesterdayStart, $lt: todayStart },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Sale.countDocuments({
        ...salesQuery,
        createdAt: { $gte: todayStart },
        status: "completed",
      }),
      Sale.countDocuments({
        ...salesQuery,
        createdAt: { $gte: yesterdayStart, $lt: todayStart },
        status: "completed",
      }),
      Stock.aggregate([
        { $match: aggregateStockQuery },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]),
      Customer.countDocuments({ ...tenantQuery, isActive: true }),
      // Weekly sales for chart
      Sale.aggregate([
        {
          $match: {
            ...aggregateSalesQuery,
            createdAt: { $gte: startDate, $lte: endDate },
            status: "completed",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: salesGroupFormat, date: "$createdAt" },
            },
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Missing Returns arrays
      Return.aggregate([
        {
          $match: {
            ...aggregateSalesQuery,
            createdAt: { $gte: todayStart },
            status: "completed",
            type: "sales_return"
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Return.aggregate([
        {
          $match: {
            ...aggregateSalesQuery,
            createdAt: { $gte: yesterdayStart, $lt: todayStart },
            status: "completed",
            type: "sales_return"
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    // Low stock alerts
    const lowStockItems = await Stock.find(stockQuery)
      .populate("productId", "name sku")
      .populate("branchId", "name")
      .lean();
    const lowStock = lowStockItems.filter((s) => s.quantity <= s.reorderLevel);

    // Top products
    const topProducts = await Sale.aggregate([
      {
        $match: {
          ...aggregateSalesQuery,
          createdAt: { $gte: startDate },
          status: "completed",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" },
        },
      },
      { $limit: 10 },
    ]);

    const todayGross = todaySales[0]?.total || 0;
    const yesterdayGross = yesterdaySales[0]?.total || 0;
    const todayReturnsTotal = todayReturns[0]?.total || 0;
    const yesterdayReturnsTotal = yesterdayReturns[0]?.total || 0;

    const todayTotal = Math.max(0, todayGross - todayReturnsTotal);
    const yesterdayTotal = Math.max(0, yesterdayGross - yesterdayReturnsTotal);

    const salesGrowth =
      yesterdayTotal > 0
        ? (((todayTotal - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1)
        : "0";
    const ordersGrowth =
      yesterdayOrders > 0
        ? (((todayOrders - yesterdayOrders) / yesterdayOrders) * 100).toFixed(1)
        : "0";

    const totalProducts = await Product.countDocuments({
      ...tenantQuery,
      isActive: true,
    });

    return apiSuccess({
      summary: {
        todaySales: todayTotal,
        salesGrowth: parseFloat(salesGrowth),
        todayOrders,
        ordersGrowth: parseFloat(ordersGrowth),
        totalStock: totalStock[0]?.total || 0,
        totalCustomers,
        totalProducts,
      },
      weeklySales,
      lowStockAlerts: lowStock.slice(0, 10),
      topProducts,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return apiError("Internal server error", 500);
  }
}
