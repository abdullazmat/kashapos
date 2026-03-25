import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import ActivityLog from "@/models/ActivityLog";
import { verifyPassword, setSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email, phone, password } = await request.json();

    if ((!email && !phone) || !password) {
      return apiError("Email or phone number and password are required", 400);
    }

    const query = email
      ? { email: email.toLowerCase() }
      : { phone: phone.replace(/\s+/g, "") };
    const user = await User.findOne(query);
    if (!user) {
      return apiError("Invalid credentials", 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return apiError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      return apiError("Account is disabled", 403);
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      return apiError("Business account is inactive", 403);
    }

    const payload = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branchId?.toString(),
      name: user.name,
    };

    await setSession(payload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    await ActivityLog.create({
      tenantId: user.tenantId,
      userId: user._id,
      userName: user.name,
      action: "login",
      module: "auth",
      description: "User signed in",
      metadata: { ipAddress: request.headers.get("x-forwarded-for") || "" },
    });

    return apiSuccess({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        settings: tenant.settings,
        saasProduct: tenant.saasProduct,
      },
    });
  } catch (error) {
    console.error("Sign in error:", error);
    return apiError("Internal server error", 500);
  }
}
