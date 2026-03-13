import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const tenant = await Tenant.findById(session.tenantId).lean();

    return NextResponse.json({
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
            settings: tenant.settings,
            saasProduct: tenant.saasProduct,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
