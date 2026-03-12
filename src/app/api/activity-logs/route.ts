import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const query: Record<string, unknown> = { tenantId: auth.tenantId };

    const [logs, totalActivities, actionBreakdown, moduleBreakdown, topUser] =
      await Promise.all([
        ActivityLog.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
        ActivityLog.countDocuments(query),
        ActivityLog.aggregate([
          { $match: { tenantId: auth.tenantId } },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        ActivityLog.aggregate([
          { $match: { tenantId: auth.tenantId } },
          { $group: { _id: "$module", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        ActivityLog.aggregate([
          { $match: { tenantId: auth.tenantId } },
          {
            $group: {
              _id: { userId: "$userId", userName: "$userName" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ]),
      ]);

    const topAction = actionBreakdown[0] || null;
    const topModule = moduleBreakdown[0] || null;
    const mostActiveUser = topUser[0] || null;

    return apiSuccess({
      logs,
      summary: {
        totalActivities,
        mostActiveUser: mostActiveUser
          ? { name: mostActiveUser._id.userName, count: mostActiveUser.count }
          : null,
        topModule: topModule
          ? { name: topModule._id, count: topModule.count }
          : null,
        topAction: topAction
          ? { name: topAction._id, count: topAction.count }
          : null,
      },
      actionBreakdown: actionBreakdown.map((a) => ({
        action: a._id,
        count: a.count,
      })),
      moduleBreakdown: moduleBreakdown.map((m) => ({
        module: m._id,
        count: m.count,
      })),
    });
  } catch (error) {
    console.error("ActivityLogs GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = await request.json();

    const log = await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: body.action,
      module: body.module,
      description: body.description,
      metadata: body.metadata,
    });

    return apiSuccess(log, 201);
  } catch (error) {
    console.error("ActivityLogs POST error:", error);
    return apiError("Internal server error", 500);
  }
}
