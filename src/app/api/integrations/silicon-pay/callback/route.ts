import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

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

    // TODO: Update the payment status in your database based on data.txId

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Silicon Pay Callback Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    // Some providers send GET for verification or simple notifies
    console.log("Silicon Pay GET Callback received:", req.nextUrl.searchParams.toString());
    return NextResponse.json({ success: true });
}
