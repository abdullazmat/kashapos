import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Expense from "@/models/Expense";
import PurchaseOrder from "@/models/PurchaseOrder";
import ReturnEntry from "@/models/Return";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

const quickPrompts = [
  "How are sales performing today?",
  "What should I restock this week?",
  "Which invoices are at risk?",
  "Give me a weekly executive summary.",
  "How can I improve POS performance this month?",
  "Can you help with a non-POS question?",
];

function isSalesIntent(text: string) {
  return /(sales|revenue|order|today|week)/i.test(text);
}

function isStockIntent(text: string) {
  return /(stock|inventory|restock|reorder)/i.test(text);
}

function isInvoiceIntent(text: string) {
  return /(invoice|balance|overdue|credit)/i.test(text);
}

function isSummaryIntent(text: string) {
  return /(summary|executive|overview|review|report)/i.test(text);
}

function isGreetingIntent(text: string) {
  return /^(hi|hello|hey|how are you|how r u|how's it going|good morning|good afternoon|good evening|oli otya|mwasuze mutya)/i.test(
    text,
  );
}

function isSmallTalkIntent(text: string) {
  return /^(thanks?|thank you|ok(?:ay)?|nice|great|cool|who are you|help|sawa|kale)/i.test(
    text,
  );
}

function isCustomerIntent(text: string) {
  return /(customer|client|retention|repeat buyer|loyal|churn|balance)/i.test(
    text,
  );
}

function isPurchaseIntent(text: string) {
  return /(purchase|supplier|vendor|procure|procurement|receiv|delivery)/i.test(
    text,
  );
}

function isExpenseIntent(text: string) {
  return /(expense|cost|spend|overhead|rent|utilities|salary|profit|margin)/i.test(
    text,
  );
}

function isReturnIntent(text: string) {
  return /(return|refund|exchange|damage|rejected)/i.test(text);
}

function isTaxIntent(text: string) {
  return /(tax|vat|e?fris|filing|compliance)/i.test(text);
}

function isPOSDomainQuestion(text: string) {
  return /(pos|point of sale|dashboard|stock|inventory|sales|invoice|customer|supplier|vendor|purchase|expense|cash flow|returns?|tax|payment|collection|revenue|product|branch|warehouse)/i.test(
    text,
  );
}

function isLugandaText(text: string) {
  return /(oli otya|webale|nsaba|nange|ensimbi|ebintu|olunaku|wiiki|kusasula|amabanja)/i.test(
    text,
  );
}

function formatAmount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number) {
  return `${(Math.round(value * 10) / 10).toLocaleString()}%`;
}

function getGeneralAnswer(text: string) {
  const cleaned = text.trim();

  if (
    /(what(?:'s| is)?\s+the\s+time|current time|date today|today'?s date)/i.test(
      cleaned,
    )
  ) {
    return `Current server date/time is ${new Date().toLocaleString()}.`;
  }

  const mathExpr = cleaned.replace(/\s+/g, "");
  if (/^[0-9+\-*/().%]+$/.test(mathExpr) && /[+\-*/%]/.test(mathExpr)) {
    try {
      const result = Number(Function(`"use strict"; return (${mathExpr});`)());
      if (Number.isFinite(result)) {
        return `Result: ${result.toLocaleString()}.`;
      }
    } catch {
      return "I could not evaluate that expression reliably. Please check the math expression format.";
    }
  }

  if (/(define|what is|explain|meaning of)/i.test(cleaned)) {
    return "I can provide a brief explanation, but I do not browse the web from this assistant endpoint. If you want precision, share the exact concept and context.";
  }

  return "I can answer basic general questions, but I do not use external web browsing here. For detailed answers, ask a narrower question or switch to POS analytics questions.";
}

function formatAssistantContextLabel(contextPath?: string) {
  const path = (contextPath || "").toLowerCase();

  if (path.includes("/dashboard/ai")) return "AI Assistant workspace";
  if (path.includes("/dashboard/invoices")) return "Invoices workspace";
  if (path.includes("/dashboard/inventory")) return "Inventory workspace";
  if (path.includes("/dashboard/sales")) return "Sales workspace";
  if (path.includes("/dashboard/customers")) return "Customers workspace";
  if (path.includes("/dashboard/purchases")) return "Purchases workspace";
  if (path.includes("/dashboard/expenses")) return "Expenses workspace";
  if (path.includes("/dashboard/settings")) return "Settings workspace";
  if (path.includes("/dashboard")) return "Dashboard workspace";

  return "business workspace";
}

function toTone(
  text: string,
  tone: "professional" | "friendly" | "concise" | "brief",
) {
  if (tone === "brief" || tone === "concise") {
    return text.split("\n").slice(0, 4).join("\n");
  }

  if (tone === "friendly") {
    return text.replace("Recommendation:", "Friendly recommendation:");
  }

  return text;
}

type SuggestedAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export async function GET() {
  return apiSuccess({ quickPrompts });
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as {
      message?: string;
      contextPath?: string;
      confirmAction?: boolean;
      actionId?: string;
    };

    const message = (body.message || "").trim();
    if (!message) {
      return apiError("Message is required", 400);
    }

    if (body.confirmAction && body.actionId) {
      return apiSuccess({
        reply:
          body.actionId === "open-inventory-forecast"
            ? "Action confirmed. Opening inventory forecasting focus."
            : body.actionId === "open-overdue-invoices"
              ? "Action confirmed. Opening overdue invoice queue."
              : "Action confirmed.",
        actionResult: {
          actionId: body.actionId,
          status: "completed",
        },
      });
    }

    const tenantObjectId = new mongoose.Types.ObjectId(auth.tenantId);

    const tenant = await Tenant.findById(auth.tenantId)
      .select(
        "name settings.aiAssistantEnabled settings.aiLanguage settings.aiTone settings.aiCreditAlertThreshold",
      )
      .lean();

    if (tenant?.settings?.aiAssistantEnabled === false) {
      return apiError("AI Assistant is disabled in AI settings", 403);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      todaySalesAgg,
      weeklySalesAgg,
      thirtyDaySalesAgg,
      paymentMixAgg,
      topProducts,
      lowStockCount,
      lowStockSample,
      overdueInvoices,
      overdueInvoiceBalance,
      overdueCustomers,
      activeCustomers30d,
      purchaseAgg,
      pendingPurchases,
      expensesAgg,
      returnsAgg,
      customerBalanceAgg,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: todayStart, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: sevenDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: sevenDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$total" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "completed",
            createdAt: { $gte: sevenDaysAgo, $lte: now },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productName",
            revenue: { $sum: "$items.total" },
            qty: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 3 },
      ]),
      Stock.countDocuments({
        tenantId: auth.tenantId,
        $expr: { $lte: ["$quantity", "$reorderLevel"] },
      }),
      Stock.find({
        tenantId: auth.tenantId,
        $expr: { $lte: ["$quantity", "$reorderLevel"] },
      })
        .populate("productId", "name")
        .sort({ quantity: 1 })
        .limit(5)
        .lean(),
      Invoice.countDocuments({ tenantId: auth.tenantId, status: "overdue" }),
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: "overdue",
          },
        },
        { $group: { _id: null, total: { $sum: "$balance" } } },
      ]),
      Customer.countDocuments({
        tenantId: auth.tenantId,
        paymentStatus: "overdue",
        isActive: true,
      }),
      Sale.distinct("customerId", {
        tenantId: auth.tenantId,
        status: "completed",
        customerId: { $exists: true, $ne: null },
        createdAt: { $gte: thirtyDaysAgo, $lte: now },
      }),
      PurchaseOrder.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      PurchaseOrder.countDocuments({
        tenantId: auth.tenantId,
        status: { $in: ["draft", "ordered", "partial"] },
      }),
      Expense.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            date: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      ReturnEntry.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      Customer.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            outstandingBalance: { $sum: "$outstandingBalance" },
            totalSpent: { $sum: "$totalSpent" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const todaySales = todaySalesAgg[0]?.total || 0;
    const todayOrders = todaySalesAgg[0]?.count || 0;
    const weeklySales = weeklySalesAgg[0]?.total || 0;
    const weeklyOrders = weeklySalesAgg[0]?.count || 0;
    const monthlySales = thirtyDaySalesAgg[0]?.total || 0;
    const overdueBalance = overdueInvoiceBalance[0]?.total || 0;
    const purchaseTotal30d = purchaseAgg[0]?.total || 0;
    const purchaseCount30d = purchaseAgg[0]?.count || 0;
    const expensesTotal30d = expensesAgg[0]?.total || 0;
    const expensesCount30d = expensesAgg[0]?.count || 0;
    const returnsTotal30d = returnsAgg[0]?.total || 0;
    const returnsCount30d = returnsAgg[0]?.count || 0;
    const outstandingCustomerBalance =
      customerBalanceAgg[0]?.outstandingBalance || 0;
    const activeCustomerCount = customerBalanceAgg[0]?.count || 0;

    const cashAmount = paymentMixAgg
      .filter((row) => row._id === "cash")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const creditAmount = paymentMixAgg
      .filter((row) => row._id === "credit")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const aovWeek = weeklyOrders > 0 ? weeklySales / weeklyOrders : 0;
    const grossMarginProxy =
      monthlySales > 0
        ? ((monthlySales - purchaseTotal30d - expensesTotal30d) /
            monthlySales) *
          100
        : 0;

    const luganda = isLugandaText(message);
    const configuredLang = tenant?.settings?.aiLanguage || "en";
    const effectiveLuganda = luganda || configuredLang === "lg";
    const tone = (tenant?.settings?.aiTone || "professional") as
      | "professional"
      | "friendly"
      | "concise"
      | "brief";

    const contextLabel = formatAssistantContextLabel(body.contextPath);
    const header = effectiveLuganda
      ? `[AI-generated] Ndi mu ${contextLabel}.`
      : `[AI-generated] Assistant context: ${contextLabel}.`;

    let reply = header;
    let suggestedAction: SuggestedAction | undefined;

    const looksDomainRelated =
      isPOSDomainQuestion(message) || contextLabel.startsWith("/dashboard");
    const wantsSales = isSalesIntent(message);
    const wantsStock = isStockIntent(message);
    const wantsInvoices = isInvoiceIntent(message);
    const wantsSummary = isSummaryIntent(message);
    const wantsCustomers = isCustomerIntent(message);
    const wantsPurchases = isPurchaseIntent(message);
    const wantsExpenses = isExpenseIntent(message);
    const wantsReturns = isReturnIntent(message);
    const wantsTax = isTaxIntent(message);
    const wantsSmallTalk = isSmallTalkIntent(message);

    const matchedIntentCount = [
      wantsSales,
      wantsStock,
      wantsInvoices,
      wantsSummary,
      wantsCustomers,
      wantsPurchases,
      wantsExpenses,
      wantsReturns,
      wantsTax,
    ].filter(Boolean).length;

    if (isGreetingIntent(message)) {
      reply += effectiveLuganda
        ? "\nGyendi bulungi, webale. Nsobola okukuyamba ku sales, inventory, invoices, purchases, expenses, returns, n' executive summary."
        : "\nI am doing well, thank you. I can help with sales, inventory, invoices, purchases, expenses, returns, and executive summaries.";
    } else if (wantsSmallTalk) {
      reply += effectiveLuganda
        ? "\nKale. Bwoba oyagala, mbuuza ekibuuzo kya POS nga sales trend, low stock, overdue invoices, oba weekly summary."
        : "\nSure. If you want, ask a POS question like sales trend, low stock, overdue invoices, or a weekly summary.";
    } else if (!looksDomainRelated) {
      reply += effectiveLuganda
        ? "\nEkibuuzo kino kirabika si kya POS. Nsobola okuwa answer ennyimpi eya bulijjo, naye empiima zange zisinga ku business yo mu dashboard."
        : "\nThat looks unrelated to POS. I can still give a brief general answer, but my strongest support is on your business dashboard data.";

      reply += `\n${getGeneralAnswer(message)}`;

      reply += effectiveLuganda
        ? "\nBwoba oyagala insights ezirina action, mbuuza ku sales, stock, invoices, purchases, oba expenses."
        : "\nIf you want actionable insights, ask about sales, stock, invoices, purchases, expenses, returns, or customer risk.";
    } else {
      if (matchedIntentCount === 0) {
        reply += effectiveLuganda
          ? "\nNsobola okukuyamba naye ekibuuzo kino tekiraga area gy'oyagala. Londako: sales, inventory, invoices, purchases, expenses, returns, oba summary."
          : "\nI can help, but this message does not indicate which POS area you want. Choose one: sales, inventory, invoices, purchases, expenses, returns, or summary.";
        reply += `\nQuick snapshot: today sales ${formatAmount(todaySales)}, low-stock ${lowStockCount}, overdue invoices ${overdueInvoices}.`;
        reply = toTone(reply, tone);
        return apiSuccess({ reply });
      }

      const topProductLabel = topProducts[0]?._id
        ? `${topProducts[0]._id} (${formatAmount(topProducts[0].revenue)})`
        : effectiveLuganda
          ? "tewali data emala"
          : "insufficient product data";

      const lowStockNames = lowStockSample
        .map((row) => (row.productId as { name?: string } | null)?.name)
        .filter(Boolean)
        .slice(0, 3);

      const sampleText =
        lowStockNames.length > 0
          ? lowStockNames.join(", ")
          : effectiveLuganda
            ? "tewali product details"
            : "no product names available";

      const detailLines: string[] = [];

      if (wantsSummary) {
        detailLines.push(
          `Executive summary (7 days): revenue ${formatAmount(weeklySales)}, orders ${weeklyOrders}, AOV ${formatAmount(aovWeek)}.`,
        );
        detailLines.push(
          `Cash vs credit: cash ${formatAmount(cashAmount)}, credit ${formatAmount(creditAmount)}.`,
        );
      }

      if (wantsSales || wantsSummary) {
        detailLines.push(
          `Sales today: ${todayOrders} orders, revenue ${formatAmount(todaySales)}.`,
        );
        detailLines.push(`Top product this week: ${topProductLabel}.`);
      }

      if (wantsStock || wantsSummary) {
        detailLines.push(
          `Low-stock records: ${lowStockCount}. Priority items: ${sampleText}.`,
        );
      }

      if (wantsInvoices || wantsCustomers || wantsSummary) {
        const threshold = Number(tenant?.settings?.aiCreditAlertThreshold || 0);
        detailLines.push(
          `Overdue invoices: ${overdueInvoices}, balance ${formatAmount(overdueBalance)}.`,
        );
        detailLines.push(
          `Overdue customers: ${overdueCustomers}, active customers: ${activeCustomerCount}, outstanding customer balance ${formatAmount(outstandingCustomerBalance)}.`,
        );
        detailLines.push(`Credit alert threshold: ${formatAmount(threshold)}.`);
      }

      if (wantsPurchases || wantsSummary) {
        detailLines.push(
          `Purchases (30 days): ${purchaseCount30d} orders, total ${formatAmount(purchaseTotal30d)}, open purchase orders ${pendingPurchases}.`,
        );
      }

      if (wantsExpenses || wantsSummary) {
        detailLines.push(
          `Expenses (30 days): ${expensesCount30d} entries, total ${formatAmount(expensesTotal30d)}.`,
        );
        detailLines.push(
          `Estimated operating margin proxy: ${formatPercent(grossMarginProxy)}.`,
        );
      }

      if (wantsReturns || wantsSummary) {
        detailLines.push(
          `Returns (30 days): ${returnsCount30d}, value ${formatAmount(returnsTotal30d)}.`,
        );
      }

      if (wantsTax) {
        detailLines.push(
          "Tax guidance: use the Taxes tab to verify configured rates and filing-ready summaries.",
        );
      }

      reply += `\n${detailLines.join("\n")}`;

      if (wantsInvoices || wantsCustomers) {
        reply +=
          "\nRecommendation: prioritize follow-up by highest balances and schedule daily reminders.";
        suggestedAction = {
          id: "open-overdue-invoices",
          label: "Open Invoices",
          description: "Jump to invoices and review overdue balances.",
          href: "/dashboard/invoices?tab=overdue",
        };
      } else if (wantsStock || wantsPurchases) {
        reply +=
          "\nRecommendation: trigger threshold-based replenishment and clear open purchase orders for fast-moving SKUs.";
        suggestedAction = {
          id: "open-inventory-forecast",
          label: "Review Inventory Forecast",
          description:
            "Open smart insights with inventory forecasting in focus.",
          href: "/dashboard/ai?tab=inventory-forecasting",
        };
      } else if (wantsExpenses || wantsReturns) {
        reply +=
          "\nRecommendation: identify top cost drivers and high-return SKUs, then adjust pricing or reorder quantities.";
      } else {
        reply += `\nRecommendation: this week, protect top-product availability (${topProductLabel}), reduce low-stock risk (${lowStockCount}), and recover overdue balances (${overdueInvoices}).`;
      }
    }

    reply = toTone(reply, tone);

    return apiSuccess({ reply, suggestedAction });
  } catch (error) {
    console.error("AI chat POST error:", error);
    return apiError("Internal server error", 500);
  }
}
