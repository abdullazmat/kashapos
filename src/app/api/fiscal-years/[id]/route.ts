import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import FiscalYear from "@/models/FiscalYear";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const fiscalYear = await FiscalYear.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!fiscalYear) return apiError("Fiscal year not found", 404);

    if (body.action === "set-active") {
      await FiscalYear.updateMany(
        { tenantId: auth.tenantId, status: "active", _id: { $ne: id } },
        { $set: { status: "closed" } },
      );
      fiscalYear.status = "active";
      fiscalYear.archivedAt = undefined;
      fiscalYear.lockedAt = undefined;
    }

    if (body.action === "close") {
      fiscalYear.status = "closed";
      fiscalYear.lockedAt = new Date();
    }

    if (body.action === "archive") {
      fiscalYear.status = "archived";
      fiscalYear.archivedAt = new Date();
      fiscalYear.lockedAt = new Date();
    }

    await fiscalYear.save();

    return apiSuccess({ fiscalYear });
  } catch (error) {
    console.error("Fiscal years PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}
