import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Branch from "@/models/Branch";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const branches = await Branch.find({ tenantId: auth.tenantId })
      .populate("assignedBranchId", "name code")
      .populate("managerUserId", "name role")
      .sort({ name: 1 })
      .lean();
    return apiSuccess(branches);
  } catch (error) {
    console.error("Branches GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);
    const body = await request.json();
    let code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      const count = await Branch.countDocuments({ tenantId: auth.tenantId });
      code = `LOC-${String(count + 1).padStart(3, "0")}`;
    }
    const branch = await Branch.create({
      ...body,
      code,
      tenantId: auth.tenantId,
    });
    return apiSuccess(branch, 201);
  } catch (error: unknown) {
    console.error("Branches POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("Branch with this code already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);
    const body = await request.json();
    const { _id, ...updateData } = body;
    if (!_id) return apiError("Branch ID is required", 400);
    if (typeof updateData.code === "string") {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    const branch = await Branch.findOneAndUpdate(
      { _id, tenantId: auth.tenantId },
      updateData,
      { new: true },
    );
    if (!branch) return apiError("Branch not found", 404);
    return apiSuccess(branch);
  } catch (error) {
    console.error("Branches PUT error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Branch ID is required", 400);
    const branch = await Branch.findOneAndUpdate(
      { _id: id, tenantId: auth.tenantId },
      { isActive: false },
      { new: true },
    );
    if (!branch) return apiError("Branch not found", 404);
    return apiSuccess({ message: "Branch deactivated" });
  } catch (error) {
    console.error("Branches DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
