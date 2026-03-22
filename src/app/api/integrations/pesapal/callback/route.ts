import { NextRequest, NextResponse } from "next/server";
import { PesapalService } from "@/lib/pesapal";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const OrderTrackingId = searchParams.get("OrderTrackingId");
    const OrderNotificationType = searchParams.get("OrderNotificationType");
    const OrderMerchantReference = searchParams.get("OrderMerchantReference");

    if (!OrderTrackingId) {
      return NextResponse.json({ success: false, message: "No OrderTrackingId" }, { status: 400 });
    }

    // Status check from Pesapal
    const statusResult = await PesapalService.getTransactionStatus(OrderTrackingId);

    // TODO: Update your internal database sale/invoice status based on the result
    /*
    Example statusResponse:
    {
      "payment_status_description": "Completed",
      "amount": 100.0,
      "currency": "UGX",
      "payment_method": "Visa",
      "description": "Order for INV-001",
      "status_code": 1,
      "merchant_reference": "INV-001",
      "payment_status_code": "COMPLETED",
      "currency_code": "UGX"
    }
    */

    return NextResponse.json({
      success: true,
      data: statusResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
