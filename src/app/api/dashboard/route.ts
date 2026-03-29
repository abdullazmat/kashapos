import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Return from "@/models/Return";
import PurchaseOrder from "@/models/PurchaseOrder";
import Expense from "@/models/Expense";
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
      case "day":
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

    // Financial Metrics Aggregation
    const [
      salesStats,
      purchasesStats,
      expensesStats,
      cogsStats,
      stockValueStats,
      customerDebtStats,
      totalCustomers,
      totalProducts,
      weeklySales,
      lowStockData
    ] = await Promise.all([
      // Sales Total
      Sale.aggregate([
        { 
          $match: { 
            ...aggregateSalesQuery, 
            createdAt: { $gte: startDate }, 
            status: "completed" 
          } 
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      // Purchases Total
      PurchaseOrder.aggregate([
        { 
          $match: { 
            ...aggregateSalesQuery, 
            createdAt: { $gte: startDate }, 
            status: { $in: ["received", "partially_received", "billed"] } 
          } 
        },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      // Expenses Total
      Expense.aggregate([
        { 
          $match: { 
            ...aggregateSalesQuery, 
            expenseDate: { $gte: startDate }, 
            status: "paid" 
          } 
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      // COGS (Cost of Goods Sold)
      Sale.aggregate([
        { 
          $match: { 
            ...aggregateSalesQuery, 
            createdAt: { $gte: startDate }, 
            status: "completed" 
          } 
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: "$product" },
        { 
          $group: { 
            _id: null, 
            total: { $sum: { $multiply: ["$items.quantity", "$product.costPrice"] } } 
          } 
        }
      ]),
      // Stock Value (Asset Valuation)
      Stock.aggregate([
        { $match: aggregateSalesQuery },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: "$product" },
        { 
          $group: { 
            _id: null, 
            total: { $sum: { $multiply: ["$quantity", "$product.costPrice"] } },
            count: { $sum: "$quantity" }
          } 
        }
      ]),
      // Customer Debt (Credit Balance)
      Customer.aggregate([
        { $match: aggregateTenantQuery },
        { $group: { _id: null, total: { $sum: "$balance" } } }
      ]),
      Customer.countDocuments({ ...tenantQuery, isActive: true }),
      Product.countDocuments({ ...tenantQuery, isActive: true }),
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
      Stock.find(salesQuery).populate("productId", "name sku reorderLevel").limit(10).lean()
    ]);

    const salesTotal = salesStats[0]?.total || 0;
    const purchasesTotal = purchasesStats[0]?.total || 0;
    const expensesTotal = expensesStats[0]?.total || 0;
    const cogsTotal = cogsStats[0]?.total || 0;
    const stockValue = stockValueStats[0]?.total || 0;
    const totalStock = stockValueStats[0]?.count || 0;
    const creditBalance = customerDebtStats[0]?.total || 0;
    const grossProfit = salesTotal - cogsTotal;
    const netProfit = grossProfit - expensesTotal;

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
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    return apiSuccess({
      summary: {
        salesTotal,
        purchasesTotal,
        expensesTotal,
        cogsTotal,
        stockValue,
        creditBalance,
        grossProfit,
        netProfit,
        totalStock,
        totalCustomers,
        totalProducts,
        todaySales: salesTotal, // Legacy fields
        todayOrders: salesStats[0]?.count || 0,
        salesGrowth: 0, 
        ordersGrowth: 0,
      },
      weeklySales,
      lowStockAlerts: lowStockData.filter((s: any) => s.quantity <= (s.productId?.reorderLevel || 0)),
      topProducts,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return apiError("Internal server error", 500);
  }
}
