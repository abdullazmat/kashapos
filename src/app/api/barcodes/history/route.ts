import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 50), 1),
      200,
    );

    const logs = await ActivityLog.find({
      tenantId: auth.tenantId,
      $or: [
        { "metadata.eventType": "barcode_scan" },
        { description: { $regex: "barcode", $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return apiSuccess({
      logs: logs.map((log) => ({
        _id: String(log._id),
        createdAt: log.createdAt,
        scannedBy: log.userName,
        barcodeValue: String(
          log.metadata?.value || log.metadata?.barcode || "-",
        ),
        productFound: String(log.metadata?.productName || "Not Found"),
        action: String(log.metadata?.scanAction || "product_lookup")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        location: String(
          log.metadata?.locationName || log.metadata?.context || "-",
        ),
        context: String(log.metadata?.context || "-"),
        result: String(log.metadata?.result || "found"),
        module: log.module,
      })),
    });
  } catch (error) {
    console.error("Barcodes history GET error:", error);
    return apiError("Internal server error", 500);
  }
}
