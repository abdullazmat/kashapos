import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import SubscriptionLead from "@/models/SubscriptionLead";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();

    const leads = await SubscriptionLead.find()
      .sort({ createdAt: -1 })
      .limit(250)
      .lean();

    return apiSuccess(leads);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();

    const { id, status } = await request.json();
    const allowedStatuses = new Set(["new", "contacted", "closed"]);

    if (!id) {
      return apiError("Lead id is required", 400);
    }
    if (!status || !allowedStatuses.has(status)) {
      return apiError("Valid status is required", 400);
    }

    const lead = await SubscriptionLead.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );

    if (!lead) {
      return apiError("Lead not found", 404);
    }

    return apiSuccess(lead);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(message, 500);
  }
}
