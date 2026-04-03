import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import { writeAuditLog } from "@/lib/audit";
import { recordCustomerPaymentForSale } from "@/lib/payment-ledger";
import { applyStockUpdate } from "@/lib/stock-service";

/**
 * Callback URL for Silicon Pay notifications
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("Silicon Pay Callback received:", data);

    // Silicon Pay sends data like:
    // {
    //   "status": "success",
    //   "txId": "...",
    //   "amount": "...",
    //   "mobile": "...",
    //   ...
    // }

    await dbConnect();

    // Log the event
    await writeAuditLog({
      tenantId: "system", // Or determine from txId if possible
      action: "payment_callback",
      tableAffected: "payments",
      recordId: data.txId || "unknown",
      newValue: data,
    } as any);

    const txId = String(data.txId || data.txRef || data.reference || "").trim();
    const statusText = String(
      data.status || data.payment_status || "",
    ).toLowerCase();
    const isSuccessful =
      statusText === "success" ||
      statusText === "completed" ||
      statusText === "paid" ||
      statusText === "approved";

    if (txId) {
      const sale = await Sale.findOne({
        $or: [
          { orderNumber: txId },
          { "paymentDetails.gatewayReference": txId },
          { "paymentDetails.mobileMoneyRef": txId },
        ],
      });

      if (sale && isSuccessful && sale.status !== "completed") {
        await applyStockUpdate(
          String(sale.tenantId),
          String(sale.branchId),
          sale.items.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            quantity: -item.quantity,
          })),
        );

        await Sale.findByIdAndUpdate(sale._id, {
          $set: {
            amountPaid: sale.total,
            remainingBalance: 0,
            paymentStatus: "cleared",
            status: "completed",
            "paymentDetails.gatewayProvider": "silicon_pay",
            "paymentDetails.gatewayStatus": "completed",
            "paymentDetails.gatewayReference": txId,
            "paymentDetails.gatewayCompletedAt": new Date(),
            "paymentDetails.gatewayResponse": data,
          },
        });

        await recordCustomerPaymentForSale({
          tenantId: String(sale.tenantId),
          saleId: String(sale._id),
          customerId: sale.customerId ? String(sale.customerId) : undefined,
          saleTotal: Number(sale.total || 0),
          amountPaid: Number(sale.total || 0),
          remainingBalance: 0,
          paymentMethod: sale.paymentMethod,
          dueDate: sale.dueDate,
          reference: txId,
          notes: "Silicon Pay payment confirmed",
        });
      } else if (sale) {
        await Sale.findByIdAndUpdate(sale._id, {
          $set: {
            "paymentDetails.gatewayProvider": "silicon_pay",
            "paymentDetails.gatewayStatus": "failed",
            "paymentDetails.gatewayReference": txId,
            "paymentDetails.gatewayError": String(
              data.message || data.error || "Payment not completed",
            ),
            "paymentDetails.gatewayResponse": data,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Silicon Pay Callback Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  // Some providers send GET for verification or simple notifies
  console.log(
    "Silicon Pay GET Callback received:",
    req.nextUrl.searchParams.toString(),
  );
  return NextResponse.json({ success: true });
}
