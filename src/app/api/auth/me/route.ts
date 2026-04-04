import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiError, apiSuccess } from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Not authenticated", 401);
    }

    await dbConnect();
    const tenant = await Tenant.findById(session.tenantId).lean();

    return apiSuccess({
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        branchId: session.branchId,
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            logo: tenant.logo,
            plan: tenant.plan,
            planExpiry: tenant.planExpiry,
            createdAt: tenant.createdAt,
            settings: tenant.settings,
            saasProduct: tenant.saasProduct,
          }
        : null,
    });
  } catch {
    return apiError("Internal server error", 500);
  }
}
