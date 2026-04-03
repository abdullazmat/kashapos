import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import { PesapalService } from "@/lib/pesapal";
import { applyStockUpdate } from "@/lib/stock-service";
import { recordCustomerPaymentForSale } from "@/lib/payment-ledger";

const COMPLETED_STATUSES = new Set(["COMPLETED", "PAID", "SUCCESS", "1"]);
const FAILED_STATUSES = new Set([
  "FAILED",
  "FAIL",
  "DECLINED",
  "CANCELLED",
  "CANCELED",
  "ERROR",
  "0",
]);

function getStatusCode(statusResult: unknown) {
  return String(
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
  )
    .toUpperCase()
    .trim();
}

function getStatusMessage(statusResult: unknown) {
  const payload = statusResult as {
    payment_status_description?: string;
    status_description?: string;
    description?: string;
    status?: string;
  } | null;

  return (
    payload?.payment_status_description ||
    payload?.status_description ||
    payload?.description ||
    payload?.status ||
    "Payment status checked"
  );
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("saleId");
    const orderNumber = searchParams.get("orderNumber");
    const orderTrackingId =
      searchParams.get("OrderTrackingId") || searchParams.get("trackingId");

    const saleQuery: Record<string, unknown> = {};
    if (saleId) {
      saleQuery._id = saleId;
    } else if (orderNumber) {
      saleQuery.orderNumber = orderNumber;
    } else if (orderTrackingId) {
      saleQuery["paymentDetails.gatewayReference"] = orderTrackingId;
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "saleId, orderNumber, or trackingId is required",
        },
        { status: 400 },
      );
    }

    const sale = await Sale.findOne(saleQuery);

    if (!sale) {
      return NextResponse.json(
        { success: false, message: "Sale not found" },
        { status: 404 },
      );
    }

    const trackingId = orderTrackingId || sale.paymentDetails?.gatewayReference;

    if (!trackingId) {
      return NextResponse.json(
        {
          success: false,
          message: "No Pesapal tracking ID found for this sale",
        },
        { status: 400 },
      );
    }

    const statusResult = await PesapalService.getTransactionStatus(trackingId);

    if (!statusResult) {
      return NextResponse.json(
        { success: false, message: "Pesapal did not return a status response" },
        { status: 502 },
      );
    }

    const statusCode = getStatusCode(statusResult);
    const statusMessage = getStatusMessage(statusResult);
    const isCompleted = COMPLETED_STATUSES.has(statusCode);
    const isFailed = FAILED_STATUSES.has(statusCode);

    if (isCompleted && sale.status !== "completed") {
      await applyStockUpdate(
        String(sale.tenantId),
        String(sale.branchId),
        sale.items.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          quantity: -item.quantity,
        })),
      );

      const updatedSale = await Sale.findByIdAndUpdate(
        sale._id,
        {
          $set: {
            amountPaid: sale.total,
            remainingBalance: 0,
            paymentStatus: "cleared",
            status: "completed",
            "paymentDetails.gatewayProvider": "pesapal",
            "paymentDetails.gatewayStatus": "completed",
            "paymentDetails.gatewayReference": trackingId,
            "paymentDetails.gatewayCompletedAt": new Date(),
            "paymentDetails.gatewayError": "",
            "paymentDetails.gatewayResponse": statusResult as Record<
              string,
              unknown
            >,
          },
        },
        { new: true },
      );

      await recordCustomerPaymentForSale({
        tenantId: String(sale.tenantId),
        saleId: String(sale._id),
        customerId: sale.customerId ? String(sale.customerId) : undefined,
        saleTotal: Number(sale.total || 0),
        amountPaid: Number(sale.total || 0),
        remainingBalance: 0,
        paymentMethod: sale.paymentMethod,
        dueDate: sale.dueDate,
        reference: trackingId || sale.orderNumber,
        notes: "Pesapal payment confirmed",
      });

      return NextResponse.json({
        success: true,
        completed: true,
        statusCode,
        message: statusMessage,
        sale: updatedSale,
        data: statusResult,
      });
    }

    if (sale.status === "completed") {
      return NextResponse.json({
        success: true,
        completed: true,
        statusCode: "COMPLETED",
        message: "Sale is already completed.",
        sale,
        data: statusResult,
      });
    }

    const gatewayStatus = isFailed ? "failed" : "initiated";
    const updatedSale = await Sale.findByIdAndUpdate(
      sale._id,
      {
        $set: {
          "paymentDetails.gatewayProvider": "pesapal",
          "paymentDetails.gatewayStatus": gatewayStatus,
          "paymentDetails.gatewayReference": trackingId,
          "paymentDetails.gatewayError": statusMessage,
          "paymentDetails.gatewayResponse": statusResult as Record<
            string,
            unknown
          >,
        },
      },
      { new: true },
    );

    return NextResponse.json({
      success: true,
      completed: false,
      statusCode,
      message: statusMessage,
      sale: updatedSale,
      data: statusResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
