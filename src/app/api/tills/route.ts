import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TillSession from "@/models/TillSession";
import Sale from "@/models/Sale";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (auth.branchId) query.branchId = auth.branchId;

    const sessions = await TillSession.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const salesQuery: Record<string, unknown> = {
      tenantId: auth.tenantId,
      status: "completed",
      paymentMethod: "cash",
      createdAt: { $gte: dayStart },
    };
    if (auth.branchId) salesQuery.branchId = auth.branchId;

    const cashSales = await Sale.aggregate([
      { $match: salesQuery },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const suggestedTillNames = Array.from(
      new Set(
        sessions
          .map((session) => String(session.tillName || "").trim())
          .filter(Boolean),
      ),
    );

    return apiSuccess({
      sessions,
      preview: {
        cashierName: auth.name || "Cashier",
        todayCashSales: Number(cashSales[0]?.total || 0),
        closingTime: new Date().toISOString(),
        suggestedTillNames,
      },
    });
  } catch (error) {
    console.error("Till sessions GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as Record<string, unknown>;

    const tillName = String(body.tillName || "").trim();
    const openingFloat = Number(body.openingFloat) || 0;
    const closingCashCount = Number(body.closingCashCount) || 0;
    const varianceReason = String(body.varianceReason || "").trim();

    if (!tillName) {
      return apiError("Till name is required", 400);
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const salesQuery: Record<string, unknown> = {
      tenantId: auth.tenantId,
      status: "completed",
      paymentMethod: "cash",
      createdAt: { $gte: dayStart },
    };
    if (auth.branchId) salesQuery.branchId = auth.branchId;

    const cashSales = await Sale.aggregate([
      { $match: salesQuery },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const expectedCash = openingFloat + (cashSales[0]?.total || 0);
    const variance = closingCashCount - expectedCash;

    if (variance !== 0 && !varianceReason) {
      return apiError(
        "Variance reason is required when variance is not zero",
        400,
      );
    }

    const session = await TillSession.create({
      tenantId: auth.tenantId,
      branchId: auth.branchId || undefined,
      tillName,
      cashierId: auth.userId || undefined,
      cashierName: auth.name || "Cashier",
      openingFloat,
      closingCashCount,
      expectedCash,
      variance,
      varianceReason,
      status: "closed",
      closedAt: new Date(),
    });

    return apiSuccess({ session }, 201);
  } catch (error) {
    console.error("Till sessions POST error:", error);
    return apiError("Internal server error", 500);
  }
}
