import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import Tenant from "@/models/Tenant";
import AIInsightCache from "@/models/AIInsightCache";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);

    const tenant = await Tenant.findById(auth.tenantId)
      .select("settings.aiSmartInsightsEnabled settings.aiDataUsageAccepted")
      .lean();

    const cached = await AIInsightCache.findOne({
      tenantId: tenantObjectId,
    }).lean();

    if (
      tenant?.settings?.aiSmartInsightsEnabled === false ||
      tenant?.settings?.aiDataUsageAccepted === false
    ) {
      if (cached?.payload) {
        return apiSuccess({
          ...cached.payload,
          source: "cache",
          generatedAt:
            cached.generatedAt?.toISOString?.() ||
            new Date(cached.generatedAt).toISOString(),
          cacheNotice:
            "Smart Insights disabled in AI settings. Showing last cached analysis.",
        });
      }

      return apiError(
        "Smart Insights disabled. Enable Smart Insights and data usage consent in AI settings.",
        403,
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const baseMatch = { tenantId: tenantObjectId };

    const [
      sales30d,
      sales7d,
      topProducts,
      stockPressure,
      totalCustomers,
      activeCustomers30d,
      overdueCustomers,
      invoiceOverdue,
      expense30d,
      productCount,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            ...baseMatch,
            status: "completed",
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: "$total" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...baseMatch,
            status: "completed",
            createdAt: { $gte: sevenDaysAgo, $lte: now },
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
      Sale.aggregate([
        {
          $match: {
            ...baseMatch,
            status: "completed",
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.productName" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Stock.aggregate([
        { $match: baseMatch },
        {
          $project: {
            quantity: 1,
            reorderLevel: 1,
            isLow: { $lte: ["$quantity", "$reorderLevel"] },
            gap: { $subtract: ["$reorderLevel", "$quantity"] },
          },
        },
        {
          $group: {
            _id: null,
            totalTrackedItems: { $sum: 1 },
            lowStockItems: {
              $sum: { $cond: [{ $eq: ["$isLow", true] }, 1, 0] },
            },
            totalGap: {
              $sum: {
                $cond: [{ $gt: ["$gap", 0] }, "$gap", 0],
              },
            },
          },
        },
      ]),
      Customer.countDocuments({ tenantId: auth.tenantId, isActive: true }),
      Sale.distinct("customerId", {
        tenantId: auth.tenantId,
        status: "completed",
        createdAt: { $gte: thirtyDaysAgo, $lte: now },
        customerId: { $exists: true, $ne: null },
      }),
      Customer.countDocuments({
        tenantId: auth.tenantId,
        isActive: true,
        paymentStatus: "overdue",
      }),
      Invoice.countDocuments({
        tenantId: auth.tenantId,
        status: "overdue",
      }),
      Expense.aggregate([
        {
          $match: {
            ...baseMatch,
            date: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$amount" },
          },
        },
      ]),
      Product.countDocuments({ tenantId: auth.tenantId, isActive: true }),
    ]);

    const salesMonth = sales30d[0] || {
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0,
    };
    const salesWeek = sales7d[0] || { totalRevenue: 0, orderCount: 0 };
    const stock = stockPressure[0] || {
      totalTrackedItems: 0,
      lowStockItems: 0,
      totalGap: 0,
    };
    const expense = expense30d[0]?.totalExpense || 0;

    const projectedWeeklyRevenue = Math.round(
      (salesWeek.totalRevenue || 0) * 1.08,
    );
    const reorderUrgency = stock.totalTrackedItems
      ? Number(
          ((stock.lowStockItems / stock.totalTrackedItems) * 100).toFixed(1),
        )
      : 0;

    const smartNarratives = [
      salesMonth.totalRevenue > expense
        ? "Sales momentum is currently covering operating costs."
        : "Operating costs are close to sales momentum; review margin-heavy SKUs.",
      reorderUrgency > 20
        ? "Inventory pressure is elevated. Prioritize replenishment of fast movers."
        : "Inventory health is stable with manageable reorder pressure.",
      totalCustomers > 0 && activeCustomers30d.length / totalCustomers < 0.35
        ? "Customer reactivation campaign is recommended for dormant accounts."
        : "Customer activity rate is healthy this period.",
    ];

    const response = {
      generatedAt: now.toISOString(),
      smartInsights: {
        salesIntelligence: {
          revenue30d: Math.round(salesMonth.totalRevenue || 0),
          orders30d: salesMonth.orderCount || 0,
          averageOrderValue: Math.round(salesMonth.avgOrderValue || 0),
          revenue7d: Math.round(salesWeek.totalRevenue || 0),
          projectedWeeklyRevenue,
          topProducts,
        },
        inventoryForecasting: {
          lowStockItems: stock.lowStockItems,
          totalTrackedItems: stock.totalTrackedItems,
          reorderUrgency,
          projectedDemandGap: Math.max(0, Math.round(stock.totalGap * 1.15)),
          activeProducts: productCount,
        },
        customerBehaviour: {
          activeCustomers30d: activeCustomers30d.length,
          totalCustomers,
          overdueCustomers,
          overdueInvoices: invoiceOverdue,
          engagementRate:
            totalCustomers > 0
              ? Number(
                  ((activeCustomers30d.length / totalCustomers) * 100).toFixed(
                    1,
                  ),
                )
              : 0,
        },
      },
      automatedReports: {
        dailySummary: {
          salesTodayEstimate: Math.round((salesWeek.totalRevenue || 0) / 7),
          ordersTodayEstimate: Math.round((salesWeek.orderCount || 0) / 7),
          inventoryAlerts: stock.lowStockItems,
        },
        weeklyBusinessReview: {
          weeklyRevenue: Math.round(salesWeek.totalRevenue || 0),
          weeklyOrders: salesWeek.orderCount || 0,
          expense30d: Math.round(expense),
          marginSignal:
            salesMonth.totalRevenue > 0
              ? Number(
                  (
                    ((salesMonth.totalRevenue - expense) /
                      salesMonth.totalRevenue) *
                    100
                  ).toFixed(1),
                )
              : 0,
        },
      },
      narratives: smartNarratives,
      source: "live",
    };

    await AIInsightCache.findOneAndUpdate(
      { tenantId: tenantObjectId },
      {
        $set: {
          payload: response,
          generatedAt: now,
        },
      },
      { upsert: true, new: true },
    );

    return apiSuccess(response);
  } catch (error) {
    console.error("AI insights GET error:", error);

    try {
      const auth = getAuthContext(request);
      const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);
      const cached = await AIInsightCache.findOne({
        tenantId: tenantObjectId,
      }).lean();
      if (cached?.payload) {
        return apiSuccess({
          ...cached.payload,
          source: "cache",
          generatedAt:
            cached.generatedAt?.toISOString?.() ||
            new Date(cached.generatedAt).toISOString(),
          cacheNotice:
            "Live insight generation failed. Showing last cached analysis.",
        });
      }
    } catch {
      // ignore cache fallback errors
    }

    return apiError("Internal server error", 500);
  }
}
