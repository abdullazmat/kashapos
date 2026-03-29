import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
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
    const [plans, tenants] = await Promise.all([
      Plan.find({ isActive: true }),
      Tenant.find({ isActive: true }, 'plan')
    ]);

    // Aggregate stats by plan
    const stats = plans.map(p => {
      const count = tenants.filter(t => t.plan?.toLowerCase() === p.name?.toLowerCase()).length;
      return {
        _id: p._id,
        name: p.name,
        count,
        price: p.price,
        mrr: (p.price || 0) * count
      };
    });

    const totalMRR = stats.reduce((sum, s) => sum + s.mrr, 0);

    return apiSuccess({ stats, totalMRR });
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
