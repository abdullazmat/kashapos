import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import ReturnEntry from "@/models/Return";
import Tenant from "@/models/Tenant";
import AIInsightCache from "@/models/AIInsightCache";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-UG", {
    month: "short",
    day: "numeric",
  });
}

function segmentCustomer(
  customer: {
    _id: mongoose.Types.ObjectId;
    totalSpent?: number;
    totalPurchases?: number;
  },
  recentIds: Set<string>,
  highValueThreshold: number,
) {
  const id = String(customer._id);
  const totalSpent = Number(customer.totalSpent || 0);
  const totalPurchases = Number(customer.totalPurchases || 0);
  const isRecent = recentIds.has(id);

  if (totalPurchases === 0) return "New";
  if (!isRecent) return "At Risk";
  if (totalSpent >= highValueThreshold) return "High Value";
  if (totalPurchases >= 5) return "Regular";
  return "Occasional";
}

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
    const todayStart = startOfDay(now);
    const sevenDaysAgo = addDays(todayStart, -6);
    const fourteenDaysAgo = addDays(todayStart, -13);
    const thirtyDaysAgo = addDays(todayStart, -29);
    const previousThirtyDaysAgo = addDays(thirtyDaysAgo, -30);
    const baseMatch = { tenantId: tenantObjectId };

    const [
      sales30d,
      sales7d,
      salesToday,
      topProducts,
      productMomentum30d,
      productMomentumPrev30d,
      dailyRevenue14d,
      hourlySales,
      paymentBreakdown,
      discountImpact,
      stockRows,
      activeCustomerIds30d,
      customers,
      overdueInvoices,
      expense30d,
      productCount,
      returnSignals,
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
            totalDiscount: { $sum: "$totalDiscount" },
            grossSales: { $sum: "$subtotal" },
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
            createdAt: { $gte: todayStart, $lte: now },
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
      ]),
      Sale.aggregate([
        {
          $match: {
            ...baseMatch,
            status: "completed",
            createdAt: { $gte: previousThirtyDaysAgo, $lt: thirtyDaysAgo },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...baseMatch,
            status: "completed",
            createdAt: { $gte: fourteenDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            revenue: { $sum: "$total" },
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
        {
          $group: {
            _id: { $hour: "$createdAt" },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
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
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$total" },
            orders: { $sum: 1 },
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
        {
          $group: {
            _id: null,
            grossSales: { $sum: "$subtotal" },
            totalDiscount: { $sum: "$totalDiscount" },
            netSales: { $sum: "$total" },
            discountedOrders: {
              $sum: { $cond: [{ $gt: ["$totalDiscount", 0] }, 1, 0] },
            },
          },
        },
      ]),
      Stock.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            productId: 1,
            quantity: 1,
            reorderLevel: 1,
            productName: "$product.name",
            unit: "$product.unit",
          },
        },
      ]),
      Sale.distinct("customerId", {
        tenantId: auth.tenantId,
        status: "completed",
        createdAt: { $gte: thirtyDaysAgo, $lte: now },
        customerId: { $exists: true, $ne: null },
      }),
      Customer.find({ tenantId: auth.tenantId, isActive: true })
        .select(
          "name totalSpent totalPurchases outstandingBalance creditLimit paymentStatus",
        )
        .lean(),
      Invoice.find({ tenantId: auth.tenantId, status: "overdue" })
        .select("invoiceNumber balance dueDate")
        .sort({ balance: -1 })
        .limit(5)
        .lean(),
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
      ReturnEntry.aggregate([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
            status: { $in: ["approved", "completed"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            productName: { $first: "$items.productName" },
            returnedQty: { $sum: "$items.quantity" },
            returnValue: { $sum: "$items.total" },
          },
        },
        { $sort: { returnedQty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const salesMonth = sales30d[0] || {
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0,
      totalDiscount: 0,
      grossSales: 0,
    };
    const salesWeek = sales7d[0] || { totalRevenue: 0, orderCount: 0 };
    const today = salesToday[0] || { totalRevenue: 0, orderCount: 0 };
    const expense = expense30d[0]?.totalExpense || 0;
    const projectedWeeklyRevenue = Math.round(
      Number(salesWeek.totalRevenue || 0) * 1.08,
    );

    const productVelocity = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const item of productMomentum30d) {
      productVelocity.set(String(item._id), {
        name: String(item.name || "Unknown Product"),
        quantity: Number(item.quantity || 0),
        revenue: Number(item.revenue || 0),
      });
    }

    const previousMomentum = new Map<
      string,
      { quantity: number; revenue: number }
    >();
    for (const item of productMomentumPrev30d) {
      previousMomentum.set(String(item._id), {
        quantity: Number(item.quantity || 0),
        revenue: Number(item.revenue || 0),
      });
    }

    const trendMap = new Map<string, number>();
    for (const row of dailyRevenue14d) {
      const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
      trendMap.set(key, Number(row.revenue || 0));
    }

    const revenueTrend = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(fourteenDaysAgo, index);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      return {
        label: formatDayLabel(date),
        revenue: Math.round(trendMap.get(key) || 0),
      };
    });

    const hourlyMap = new Map<number, { revenue: number; orders: number }>();
    for (const row of hourlySales) {
      hourlyMap.set(Number(row._id || 0), {
        revenue: Number(row.revenue || 0),
        orders: Number(row.orders || 0),
      });
    }

    const peakHours = Array.from({ length: 12 }, (_, index) => {
      const hour = index + 8;
      const value = hourlyMap.get(hour) || { revenue: 0, orders: 0 };
      return {
        hour: `${hour.toString().padStart(2, "0")}:00`,
        revenue: Math.round(value.revenue),
        orders: value.orders,
      };
    });

    const totalPaymentAmount = paymentBreakdown.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );
    const paymentMix = paymentBreakdown
      .map((row) => ({
        method: String(row._id || "unknown").replace(/_/g, " "),
        amount: Math.round(Number(row.amount || 0)),
        orders: Number(row.orders || 0),
        share:
          totalPaymentAmount > 0
            ? Number(
                ((Number(row.amount || 0) / totalPaymentAmount) * 100).toFixed(
                  1,
                ),
              )
            : 0,
      }))
      .sort((left, right) => right.amount - left.amount);

    const discountSummary = discountImpact[0] || {
      grossSales: 0,
      totalDiscount: 0,
      netSales: 0,
      discountedOrders: 0,
    };

    const reorderPredictions = stockRows
      .map((row) => {
        const velocity = productVelocity.get(String(row.productId));
        const avgDailyUnits = velocity
          ? Number(velocity.quantity || 0) / 30
          : 0;
        const currentQuantity = Number(row.quantity || 0);
        const reorderLevel = Number(row.reorderLevel || 0);
        const daysLeft =
          avgDailyUnits > 0
            ? Math.max(0, Math.floor(currentQuantity / avgDailyUnits))
            : null;
        const suggestedOrderQty = Math.max(
          reorderLevel * 2 - currentQuantity,
          Math.ceil(avgDailyUnits * 14) - currentQuantity,
          0,
        );

        return {
          productId: String(row.productId),
          productName: String(row.productName || "Unknown Product"),
          currentQuantity,
          reorderLevel,
          daysLeft,
          suggestedOrderQty,
          avgDailyUnits: Number(avgDailyUnits.toFixed(1)),
        };
      })
      .filter(
        (row) =>
          row.daysLeft !== null || row.currentQuantity <= row.reorderLevel,
      )
      .sort((left, right) => {
        const leftDays = left.daysLeft ?? Number.MAX_SAFE_INTEGER;
        const rightDays = right.daysLeft ?? Number.MAX_SAFE_INTEGER;
        return (
          leftDays - rightDays || left.currentQuantity - right.currentQuantity
        );
      })
      .slice(0, 6);

    const recentSoldProductIds = new Set(productVelocity.keys());
    const deadStockAlerts = stockRows
      .filter(
        (row) =>
          Number(row.quantity || 0) > 0 &&
          !recentSoldProductIds.has(String(row.productId)),
      )
      .sort(
        (left, right) =>
          Number(right.quantity || 0) - Number(left.quantity || 0),
      )
      .slice(0, 5)
      .map((row) => ({
        productName: String(row.productName || "Unknown Product"),
        quantity: Number(row.quantity || 0),
        suggestedAction:
          Number(row.quantity || 0) > Number(row.reorderLevel || 0) * 2
            ? "Discount or bundle"
            : "Hold and review",
      }));

    const seasonalPatterns = Array.from(productVelocity.entries())
      .map(([productId, current]) => {
        const previous = previousMomentum.get(productId) || {
          quantity: 0,
          revenue: 0,
        };
        const baseline = previous.quantity || 1;
        const changePct =
          ((current.quantity - previous.quantity) / baseline) * 100;
        return {
          productName: current.name,
          changePct: Number(changePct.toFixed(1)),
          recommendation:
            changePct > 20
              ? "Consider stocking up one cycle earlier."
              : "Monitor demand and keep normal buying rhythm.",
        };
      })
      .filter((item) => item.changePct > 15)
      .sort((left, right) => right.changePct - left.changePct)
      .slice(0, 3);

    const wastageTracking = returnSignals.map((row) => ({
      productName: String(row.productName || "Unknown Product"),
      returnedQty: Number(row.returnedQty || 0),
      returnValue: Math.round(Number(row.returnValue || 0)),
      recommendation:
        Number(row.returnedQty || 0) >= 5
          ? "Reduce batch size and review handling losses."
          : "Keep current ordering cadence but monitor write-offs.",
    }));

    const sortedSpend = customers
      .map((customer) => Number(customer.totalSpent || 0))
      .sort((left, right) => right - left);
    const highValueThreshold =
      sortedSpend[Math.max(0, Math.floor(sortedSpend.length * 0.25) - 1)] || 0;
    const recentCustomerIdSet = new Set(activeCustomerIds30d.map(String));

    const segments = new Map<
      string,
      {
        label: string;
        count: number;
        totalSpend: number;
        totalPurchases: number;
      }
    >();
    const segmentOrder = [
      "High Value",
      "Regular",
      "Occasional",
      "At Risk",
      "New",
    ];
    for (const label of segmentOrder) {
      segments.set(label, {
        label,
        count: 0,
        totalSpend: 0,
        totalPurchases: 0,
      });
    }

    const churnCandidates: {
      customerName: string;
      totalSpent: number;
      totalPurchases: number;
      suggestedAction: string;
    }[] = [];
    const creditRiskCounts = { low: 0, medium: 0, high: 0 };
    const creditRiskHighlights: {
      customerName: string;
      outstandingBalance: number;
      risk: "Low" | "Medium" | "High";
    }[] = [];

    for (const customer of customers) {
      const segment = segmentCustomer(
        customer,
        recentCustomerIdSet,
        highValueThreshold,
      );
      const bucket = segments.get(segment)!;
      bucket.count += 1;
      bucket.totalSpend += Number(customer.totalSpent || 0);
      bucket.totalPurchases += Number(customer.totalPurchases || 0);

      const outstandingBalance = Number(customer.outstandingBalance || 0);
      const creditLimit = Number(customer.creditLimit || 0);
      let risk: "Low" | "Medium" | "High" = "Low";
      if (
        customer.paymentStatus === "overdue" ||
        (creditLimit > 0 && outstandingBalance / creditLimit >= 0.75)
      ) {
        risk = "High";
        creditRiskCounts.high += 1;
      } else if (outstandingBalance > 0) {
        risk = "Medium";
        creditRiskCounts.medium += 1;
      } else {
        creditRiskCounts.low += 1;
      }

      if (risk !== "Low") {
        creditRiskHighlights.push({
          customerName: String(customer.name || "Customer"),
          outstandingBalance,
          risk,
        });
      }

      if (segment === "At Risk") {
        churnCandidates.push({
          customerName: String(customer.name || "Customer"),
          totalSpent: Number(customer.totalSpent || 0),
          totalPurchases: Number(customer.totalPurchases || 0),
          suggestedAction:
            outstandingBalance > 0
              ? "Send a payment reminder and loyalty offer."
              : "Send a comeback promotion.",
        });
      }
    }

    const segmentRows = segmentOrder.map((label) => {
      const bucket = segments.get(label)!;
      return {
        label,
        count: bucket.count,
        averageBasketSize:
          bucket.totalPurchases > 0
            ? Math.round(bucket.totalSpend / bucket.totalPurchases)
            : 0,
      };
    });

    const loyaltyInsights = [...customers]
      .sort(
        (left, right) =>
          Number(right.totalPurchases || 0) -
            Number(left.totalPurchases || 0) ||
          Number(right.totalSpent || 0) - Number(left.totalSpent || 0),
      )
      .slice(0, 5)
      .map((customer) => ({
        customerName: String(customer.name || "Customer"),
        visits: Number(customer.totalPurchases || 0),
        totalSpent: Math.round(Number(customer.totalSpent || 0)),
      }));

    const lowStockItems = stockRows.filter(
      (row) => Number(row.quantity || 0) <= Number(row.reorderLevel || 0),
    ).length;
    const totalTrackedItems = stockRows.length;
    const reorderUrgency = totalTrackedItems
      ? Number(((lowStockItems / totalTrackedItems) * 100).toFixed(1))
      : 0;

    const response = {
      generatedAt: now.toISOString(),
      smartInsights: {
        salesIntelligence: {
          revenue30d: Math.round(Number(salesMonth.totalRevenue || 0)),
          orders30d: Number(salesMonth.orderCount || 0),
          averageOrderValue: Math.round(Number(salesMonth.avgOrderValue || 0)),
          revenue7d: Math.round(Number(salesWeek.totalRevenue || 0)),
          salesToday: Math.round(Number(today.totalRevenue || 0)),
          ordersToday: Number(today.orderCount || 0),
          projectedWeeklyRevenue,
          topProducts: topProducts.map((product) => ({
            name: String(product.name || "Unknown Product"),
            quantity: Number(product.quantity || 0),
            revenue: Math.round(Number(product.revenue || 0)),
          })),
          revenueTrend,
          peakHours,
          paymentBreakdown: paymentMix,
          discountImpact: {
            grossSales: Math.round(Number(discountSummary.grossSales || 0)),
            discountValue: Math.round(
              Number(discountSummary.totalDiscount || 0),
            ),
            netSales: Math.round(Number(discountSummary.netSales || 0)),
            discountedOrders: Number(discountSummary.discountedOrders || 0),
          },
        },
        inventoryForecasting: {
          lowStockItems,
          totalTrackedItems,
          reorderUrgency,
          projectedDemandGap: reorderPredictions.reduce(
            (sum, row) => sum + Number(row.suggestedOrderQty || 0),
            0,
          ),
          activeProducts: productCount,
          reorderPredictions,
          deadStockAlerts,
          seasonalPatterns,
          wastageTracking,
        },
        customerBehaviour: {
          activeCustomers30d: activeCustomerIds30d.length,
          totalCustomers: customers.length,
          overdueCustomers: customers.filter(
            (customer) => customer.paymentStatus === "overdue",
          ).length,
          overdueInvoices: overdueInvoices.length,
          engagementRate:
            customers.length > 0
              ? Number(
                  (
                    (activeCustomerIds30d.length / customers.length) *
                    100
                  ).toFixed(1),
                )
              : 0,
          segments: segmentRows,
          churnPrediction: churnCandidates
            .sort((left, right) => right.totalSpent - left.totalSpent)
            .slice(0, 5),
          averageBasketBySegment: segmentRows,
          creditRiskScoring: {
            low: creditRiskCounts.low,
            medium: creditRiskCounts.medium,
            high: creditRiskCounts.high,
            highlights: creditRiskHighlights
              .sort(
                (left, right) =>
                  right.outstandingBalance - left.outstandingBalance,
              )
              .slice(0, 5),
          },
          loyaltyInsights,
        },
      },
      automatedReports: {
        dailySummary: {
          salesTodayEstimate: Math.round(Number(today.totalRevenue || 0)),
          ordersTodayEstimate: Number(today.orderCount || 0),
          inventoryAlerts: lowStockItems,
        },
        weeklyBusinessReview: {
          weeklyRevenue: Math.round(Number(salesWeek.totalRevenue || 0)),
          weeklyOrders: Number(salesWeek.orderCount || 0),
          expense30d: Math.round(Number(expense || 0)),
          marginSignal:
            Number(salesMonth.totalRevenue || 0) > 0
              ? Number(
                  (
                    ((Number(salesMonth.totalRevenue || 0) -
                      Number(expense || 0)) /
                      Number(salesMonth.totalRevenue || 1)) *
                    100
                  ).toFixed(1),
                )
              : 0,
        },
      },
      narratives: [
        reorderUrgency > 20
          ? "Inventory pressure is elevated. Replenishment planning should happen now, not at week close."
          : "Inventory pressure is stable and can be handled inside the normal buying cycle.",
        Number(salesMonth.totalRevenue || 0) > Number(expense || 0)
          ? "Sales momentum is still covering operating costs this month."
          : "Operating costs are close to current sales momentum; margin protection needs attention.",
        activeCustomerIds30d.length / Math.max(customers.length, 1) < 0.35
          ? "Customer reactivation should be a priority because too many accounts have gone quiet."
          : "Customer activity is holding up well relative to the total customer base.",
      ],
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
