import { NextRequest, NextResponse } from "next/server";
import { PesapalService } from "@/lib/pesapal";

export async function GET() {
  try {
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { success: false, message: "Pesapal credentials not configured" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        api_url: process.env.PESAPAL_API_URL,
        ipn_id: process.env.PESAPAL_IPN_ID || "Not Registered",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, callback_url } = await req.json();

    if (action === "register_ipn") {
      if (!callback_url) {
        return NextResponse.json(
          { success: false, message: "Callback URL is required" },
          { status: 400 }
        );
      }

      const ipnId = await PesapalService.registerIpn(callback_url);
      
      // Note: In a real app, you'd save this IPN ID to your database
      // For now, we'll return it and the user should add it to their .env file
      
      return NextResponse.json({
        success: true,
        message: "IPN URL registered successfully",
        data: { ipn_id: ipnId },
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
