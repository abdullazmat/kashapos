import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import { verifyPassword, setSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: "super_admin" });
    
    if (!user) {
      return apiError("Invalid admin credentials", 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return apiError("Invalid admin credentials", 401);
    }

    if (!user.isActive) {
      return apiError("Admin account is disabled", 403);
    }

    const payload = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    await setSession(payload);

    return apiSuccess({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("Admin sign in error:", error);
    return apiError("Internal server error", 500);
  }
}
