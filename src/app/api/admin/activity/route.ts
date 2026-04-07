import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
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
    // Fetch latest 50 logs from all tenants
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name email');
    
    return apiSuccess(logs);
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}
