import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Plan from "@/models/Plan";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();
    const plans = await Plan.find().sort({ order: 1 });
    return apiSuccess(plans);
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();
    const data = await request.json();
    const plan = await Plan.create(data);
    return apiSuccess(plan);
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
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

    const plan = await Plan.findByIdAndUpdate(id, updates, { new: true });
    if (!plan) return apiError("Plan not found", 404);

    return apiSuccess(plan);
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}
