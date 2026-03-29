import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import GlobalConfig from "@/models/GlobalConfig";
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
    let config = await GlobalConfig.findOne();
    if (!config) {
      console.log("Creating default GlobalConfig...");
      config = await GlobalConfig.create({});
    }
    return apiSuccess(config);
  } catch (error: any) {
    console.error("GET /api/admin/settings Error:", error);
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
    const updates = await request.json();
    
    let config = await GlobalConfig.findOneAndUpdate({}, updates, { new: true, upsert: true });
    return apiSuccess(config);
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
