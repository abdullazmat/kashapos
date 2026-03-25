import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const unit = await Unit.findOneAndDelete({
      _id: id,
      tenantId: auth.tenantId,
    });

    if (!unit) {
      return apiError("Unit not found", 404);
    }

    return apiSuccess({ message: "Unit deleted successfully" });
  } catch (error) {
    console.error("Unit DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = await request.json();
    const unit = await Unit.findOneAndUpdate(
      { _id: id, tenantId: auth.tenantId },
      { $set: body },
      { new: true }
    );

    if (!unit) {
      return apiError("Unit not found", 404);
    }

    return apiSuccess(unit);
  } catch (error) {
    console.error("Unit PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}
