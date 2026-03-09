import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const users = await User.find({ tenantId: auth.tenantId })
      .populate("branchId", "name")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const { name, email, password, role, branchId } = await request.json();

    if (!name || !email || !password) {
      return apiError("Name, email, and password are required", 400);
    }

    const existing = await User.findOne({
      tenantId: auth.tenantId,
      email: email.toLowerCase(),
    });
    if (existing) {
      return apiError("A user with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      tenantId: auth.tenantId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "cashier",
      branchId: branchId || undefined,
    });

    const userObj = user.toObject();
    const { password: _, ...safeUser } = userObj;
    return apiSuccess(safeUser, 201);
  } catch (error: unknown) {
    console.error("Users POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("A user with this email already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("User ID is required", 400);

    if (id === auth.userId) {
      return apiError("You cannot delete your own account", 400);
    }

    const user = await User.findOneAndDelete({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!user) return apiError("User not found", 404);

    return apiSuccess({ message: "User deleted" });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
