import PDFDocument from "pdfkit";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { apiError, getAuthContext } from "@/lib/api-helpers";
import { getFiscalYearSummaryData } from "@/lib/fiscal-year-summary";

function formatCurrencyValue(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function renderFiscalSummaryPdf(params: {
  title: string;
  currency: string;
  summary: NonNullable<
    Awaited<ReturnType<typeof getFiscalYearSummaryData>>["summary"]
  >;
}) {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("Fiscal Year Financial Summary", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#6b7280").text(params.title);
    doc.moveDown(1.2).fillColor("#111827");

    const cards = [
      ["Total Revenue", params.summary.totalRevenue],
      ["Total Expenses", params.summary.totalExpenses],
      ["Gross Profit", params.summary.grossProfit],
      ["Net Profit", params.summary.netProfit],
      ["VAT/Tax Collected", params.summary.vatCollected],
      ["Outstanding Invoices", params.summary.outstandingInvoices.total],
    ] as const;

    for (const [label, value] of cards) {
      doc.fontSize(10).fillColor("#6b7280").text(label);
      doc
        .fontSize(14)
        .fillColor("#111827")
        .text(`${params.currency} ${formatCurrencyValue(Number(value || 0))}`);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.8);
    doc.fontSize(14).text("Monthly Revenue vs Expenses");
    doc.moveDown(0.4);

    for (const row of params.summary.monthlyRevenueVsExpenses) {
      doc
        .fontSize(10)
        .fillColor("#111827")
        .text(
          `${row.month}: Revenue ${params.currency} ${formatCurrencyValue(row.revenue)} | Expenses ${params.currency} ${formatCurrencyValue(row.expenses)}`,
        );
    }

    doc.moveDown(0.8);
    doc.fontSize(14).fillColor("#111827").text("Top Product Categories");
    doc.moveDown(0.4);

    if (params.summary.topProductCategories.length === 0) {
      doc.fontSize(10).fillColor("#6b7280").text("No category data available.");
    } else {
      for (const row of params.summary.topProductCategories) {
        doc
          .fontSize(10)
          .fillColor("#111827")
          .text(
            `${row.category}: ${params.currency} ${formatCurrencyValue(row.revenue)}`,
          );
      }
    }

    doc.end();
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;

    const exportData = await getFiscalYearSummaryData({
      tenantId: auth.tenantId,
      fiscalYearId: id,
      branchId: request.nextUrl.searchParams.get("branchId"),
    });

    const fiscalYear = exportData.fiscalYears.find(
      (row) => String(row._id) === id,
    );
    if (!fiscalYear || !exportData.summary) {
      return apiError("Fiscal year not found", 404);
    }

    const pdfBuffer = await renderFiscalSummaryPdf({
      title: fiscalYear.label,
      currency: request.nextUrl.searchParams.get("currency") || "UGX",
      summary: exportData.summary,
    });
    const pdfBytes = new Uint8Array(pdfBuffer);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fiscalYear.label.replace(/\s+/g, "_")}_summary.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Fiscal year PDF export error:", error);
    return apiError("Failed to generate fiscal summary PDF", 500);
  }
}
