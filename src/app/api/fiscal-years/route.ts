import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import FiscalYear from "@/models/FiscalYear";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import { getFiscalYearSummaryData } from "@/lib/fiscal-year-summary";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const data = await getFiscalYearSummaryData({
      tenantId: auth.tenantId,
      fiscalYearId: searchParams.get("fiscalYearId"),
      branchId: searchParams.get("branchId"),
    });

    return apiSuccess(data);
  } catch (error) {
    console.error("Fiscal years GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const label = String(body.label || "").trim();
    const cycle =
      body.cycle === "calendar_jan_dec" || body.cycle === "custom"
        ? body.cycle
        : "ura_jul_jun";
    const startDate = new Date(String(body.startDate || ""));
    const endDate = new Date(String(body.endDate || ""));

    if (
      !label ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return apiError("Label, start date, and end date are required", 400);
    }

    if (startDate >= endDate) {
      return apiError("End date must be after start date", 400);
    }

    if (body.setActive === true) {
      await FiscalYear.updateMany(
        { tenantId: auth.tenantId, status: "active" },
        { $set: { status: "closed" } },
      );
    }

    const fiscalYear = await FiscalYear.create({
      tenantId: auth.tenantId,
      label,
      startDate,
      endDate,
      cycle,
      status: body.setActive === true ? "active" : "closed",
      createdBy: auth.userId || undefined,
    });

    return apiSuccess({ fiscalYear }, 201);
  } catch (error) {
    console.error("Fiscal years POST error:", error);
    return apiError(
      error instanceof Error && error.message.includes("duplicate")
        ? "Fiscal year label already exists"
        : "Internal server error",
      error instanceof Error && error.message.includes("duplicate") ? 409 : 500,
    );
  }
}
