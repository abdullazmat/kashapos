import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import { recordCustomerPaymentForSale } from "@/lib/payment-ledger";
import { applyStockUpdate } from "@/lib/stock-service";
import { PesapalService } from "@/lib/pesapal";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const OrderTrackingId = searchParams.get("OrderTrackingId");
    const OrderMerchantReference = searchParams.get("OrderMerchantReference");

    if (!OrderTrackingId) {
      return NextResponse.json(
        { success: false, message: "No OrderTrackingId" },
        { status: 400 },
      );
    }

    // Status check from Pesapal
    const statusResult =
      await PesapalService.getTransactionStatus(OrderTrackingId);

    const statusCode = String(
      (
        statusResult as {
          payment_status_code?: string;
          status_code?: string | number;
        } | null
      )?.payment_status_code ||
        (
          statusResult as {
            payment_status_code?: string;
            status_code?: string | number;
          } | null
        )?.status_code ||
        "",
    ).toUpperCase();
    const isCompleted =
      statusCode === "COMPLETED" ||
      statusCode === "PAID" ||
      statusCode === "SUCCESS" ||
      statusCode === "1";

    const query: Record<string, unknown> = {
      $or: [{ "paymentDetails.gatewayReference": OrderTrackingId }],
    };

    if (OrderMerchantReference) {
      (query.$or as Array<Record<string, unknown>>).push({
        orderNumber: OrderMerchantReference,
      });
      (query.$or as Array<Record<string, unknown>>).push({
        "paymentDetails.gatewayReference": OrderMerchantReference,
      });
    }

    const sale = await Sale.findOne(query);

    if (sale && isCompleted && sale.status !== "completed") {
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
          "paymentDetails.gatewayProvider": "pesapal",
          "paymentDetails.gatewayStatus": "completed",
          "paymentDetails.gatewayReference": OrderTrackingId,
          "paymentDetails.gatewayCompletedAt": new Date(),
          "paymentDetails.gatewayResponse": statusResult as Record<
            string,
            unknown
          >,
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
        reference:
          OrderTrackingId || OrderMerchantReference || sale.orderNumber,
        notes: "Pesapal payment confirmed",
      });
    } else if (sale) {
      await Sale.findByIdAndUpdate(sale._id, {
        $set: {
          "paymentDetails.gatewayProvider": "pesapal",
          "paymentDetails.gatewayStatus": "failed",
          "paymentDetails.gatewayReference": OrderTrackingId,
          "paymentDetails.gatewayError":
            (statusResult as { payment_status_description?: string } | null)
              ?.payment_status_description || "Payment not completed",
          "paymentDetails.gatewayResponse": statusResult as Record<
            string,
            unknown
          >,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: statusResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
