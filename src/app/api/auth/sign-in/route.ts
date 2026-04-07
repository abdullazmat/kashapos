import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import ActivityLog from "@/models/ActivityLog";
import { verifyPassword, setSession, normalizeIdentifier } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // IP-based Rate Limiting (Prevent Brute Force)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = checkRateLimit({ key: `signin_${ip}`, limit: 30, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return apiError(`Too many login attempts. Try again in ${rl.retryAfterSeconds}s`, 429);
    }

    const { email, phone, password } = await request.json();

    if ((!email && !phone) || !password) {
      return apiError("Email or phone number and password are required", 400);
    }

    const normalizedIdentifier = normalizeIdentifier(email || phone);
    const query = email
      ? { email: normalizedIdentifier }
      : { phone: normalizedIdentifier };
    const user = await User.findOne(query);
    if (!user) {
      // Generic error handling (Checklist #8): Return identical responses for wrong user/pass
      return apiError("Invalid credentials", 401);
    }

    // Account Lockout verification (Checklist #1)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return apiError("Account temporarily locked due to multiple failed login attempts. Try again later.", 403);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // Lock accounts after 5 consecutive failed login attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.save();
      return apiError("Invalid credentials", 401);
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
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
