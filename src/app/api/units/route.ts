import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const units = await Unit.find({ tenantId: auth.tenantId, isActive: true })
      .sort({ name: 1 })
      .lean();
    
    // If no units found, return defaults
    if (units.length === 0) {
      return apiSuccess([
        { name: "Piece", shortName: "pcs" },
        { name: "Kilogram", shortName: "kg" },
        { name: "Litre", shortName: "litre" },
        { name: "Box", shortName: "box" },
        { name: "Pack", shortName: "pack" },
        { name: "Dozen", shortName: "dz" },
      ]);
    }

    return apiSuccess(units);
  } catch (error) {
    console.error("Units GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = await request.json();
    const { name, shortName } = body;

    if (!name || !shortName) {
      return apiError("Name and short name are required", 400);
    }

    const unit = await Unit.create({
      tenantId: auth.tenantId,
      name: name.trim(),
      shortName: shortName.trim().toLowerCase(),
    });

    return apiSuccess(unit, 201);
  } catch (error: unknown) {
    console.error("Units POST error:", error);
    const err = error as { code?: number };
    if (err.code === 11000) {
      return apiError("Unit with this name already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
