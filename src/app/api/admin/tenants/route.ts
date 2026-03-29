import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    return apiSuccess(tenants);
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();
    const { id, updates } = await request.json();

    const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });
    if (!tenant) return apiError("Tenant not found", 404);

    return apiSuccess(tenant);
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
