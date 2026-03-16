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
import { getAiContextLabel, getAiQuickPrompts } from "@/lib/ai";
import { generateExternalAiReply } from "@/lib/ai-provider";

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

type AssistantHighlight = {
  label: string;
  value: string;
};

type AssistantTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export async function GET(request: NextRequest) {
  const contextPath =
    new URL(request.url).searchParams.get("contextPath") || undefined;
  return apiSuccess({ quickPrompts: getAiQuickPrompts(contextPath) });
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
        "name settings.aiAssistantEnabled settings.aiLanguage settings.aiTone settings.aiCreditAlertThreshold settings.aiDataUsageAccepted settings.aiDataPreference settings.aiModelPreference",
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
      overdueInvoiceSample,
      overdueCustomers,
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
      Invoice.find({ tenantId: auth.tenantId, status: "overdue" })
        .select("invoiceNumber balance dueDate")
        .sort({ balance: -1 })
        .limit(5)
        .lean(),
      Customer.countDocuments({
        tenantId: auth.tenantId,
        paymentStatus: "overdue",
        isActive: true,
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
    const responseLanguage = effectiveLuganda
      ? "lg"
      : configuredLang === "sw"
        ? "sw"
        : "en";
    const tone = (tenant?.settings?.aiTone || "professional") as
      | "professional"
      | "friendly"
      | "concise"
      | "brief";
    const modelPreference = (tenant?.settings?.aiModelPreference ||
      "standard") as "standard" | "advanced" | "balanced" | "fast" | "accurate";
    const dataPreference = (tenant?.settings?.aiDataPreference ||
      "assisted") as "strict" | "assisted";

    const contextLabel = getAiContextLabel(body.contextPath);
    const header = effectiveLuganda
      ? `[AI-generated] Ndi mu ${contextLabel}.`
      : `[AI-generated] Assistant context: ${contextLabel}.`;

    let reply = header;
    let suggestedAction: SuggestedAction | undefined;
    const highlights: AssistantHighlight[] = [];
    let table: AssistantTable | undefined;

    const looksDomainRelated =
      isPOSDomainQuestion(message) ||
      Boolean(body.contextPath?.startsWith("/dashboard"));
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
        highlights.push(
          {
            label: effectiveLuganda ? "Leero" : "Today",
            value: formatAmount(todaySales),
          },
          {
            label: effectiveLuganda ? "Wiiki eno" : "This Week",
            value: formatAmount(weeklySales),
          },
          { label: "AOV", value: formatAmount(aovWeek) },
        );
      }

      if (wantsSales || wantsSummary) {
        detailLines.push(
          `Sales today: ${todayOrders} orders, revenue ${formatAmount(todaySales)}.`,
        );
        detailLines.push(`Top product this week: ${topProductLabel}.`);
        if (!table) {
          table = {
            title: effectiveLuganda
              ? "Top products this week"
              : "Top products this week",
            columns: ["Product", "Revenue", "Qty"],
            rows: topProducts
              .slice(0, 5)
              .map((product) => [
                String(product._id || product.name || "Unknown"),
                formatAmount(Number(product.revenue || 0)),
                Number(product.qty || 0).toLocaleString(),
              ]),
          };
        }
      }

      if (wantsStock || wantsSummary) {
        detailLines.push(
          `Low-stock records: ${lowStockCount}. Priority items: ${sampleText}.`,
        );
        if (!table || wantsStock) {
          table = {
            title: effectiveLuganda
              ? "Low stock watchlist"
              : "Low stock watchlist",
            columns: ["Product", "Qty", "Reorder"],
            rows: lowStockSample
              .slice(0, 5)
              .map((row) => [
                String(
                  (row.productId as { name?: string } | null)?.name ||
                    "Unknown",
                ),
                formatAmount(Number(row.quantity || 0)),
                formatAmount(Number(row.reorderLevel || 0)),
              ]),
          };
        }
        if (!highlights.some((item) => item.label === "Low Stock")) {
          highlights.push(
            { label: "Low Stock", value: String(lowStockCount) },
            { label: "Open POs", value: String(pendingPurchases) },
          );
        }
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
        if (wantsInvoices || wantsCustomers) {
          table = {
            title: effectiveLuganda ? "Overdue invoices" : "Overdue invoices",
            columns: ["Invoice", "Balance", "Due"],
            rows: overdueInvoiceSample.map((invoice) => [
              String(invoice.invoiceNumber || "Invoice"),
              formatAmount(Number(invoice.balance || 0)),
              invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString("en-UG")
                : "-",
            ]),
          };
        }
        highlights.push(
          { label: "Overdue", value: String(overdueInvoices) },
          { label: "Balance", value: formatAmount(overdueBalance) },
        );
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

    if (tenant?.settings?.aiDataUsageAccepted !== false) {
      try {
        const externalReply = await generateExternalAiReply({
          question: message,
          language: responseLanguage,
          tone,
          modelPreference,
          businessContext: {
            contextLabel,
            language: responseLanguage,
            tone,
            dataPreference,
            tenant: {
              name: dataPreference === "assisted" ? tenant?.name : undefined,
            },
            metrics: {
              todaySales,
              todayOrders,
              weeklySales,
              weeklyOrders,
              monthlySales,
              lowStockCount,
              overdueInvoices,
              overdueBalance,
              overdueCustomers,
              pendingPurchases,
              purchaseTotal30d,
              purchaseCount30d,
              expensesTotal30d,
              expensesCount30d,
              returnsTotal30d,
              returnsCount30d,
              outstandingCustomerBalance,
              activeCustomerCount,
              cashAmount,
              creditAmount,
              averageOrderValue: aovWeek,
              grossMarginProxy,
            },
            topProducts: topProducts.slice(0, 5).map((product) => ({
              name: String(product._id || product.name || "Unknown"),
              revenue: Number(product.revenue || 0),
              quantity: Number(product.qty || 0),
            })),
            lowStockItems: lowStockSample.slice(0, 5).map((row) => ({
              name: String(
                (row.productId as { name?: string } | null)?.name || "Unknown",
              ),
              quantity: Number(row.quantity || 0),
              reorderLevel: Number(row.reorderLevel || 0),
            })),
            overdueInvoices: overdueInvoiceSample
              .slice(0, 5)
              .map((invoice) => ({
                balance: Number(invoice.balance || 0),
                dueDate: invoice.dueDate
                  ? new Date(invoice.dueDate).toISOString()
                  : null,
              })),
          },
        });

        if (externalReply) {
          reply = toTone(`${header}\n${externalReply}`, tone);
        }
      } catch (error) {
        console.warn(
          "External AI provider unavailable, using fallback:",
          error,
        );
      }
    }

    return apiSuccess({
      reply,
      suggestedAction,
      highlights: highlights.slice(0, 4),
      table,
    });
  } catch (error) {
    console.error("AI chat POST error:", error);
    return apiError("Internal server error", 500);
  }
}
