import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import Branch from "@/models/Branch";
import { hashPassword, setSession } from "@/lib/auth";
import { validatePasswordPolicy } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { apiError, apiSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { businessName, email, password, name, phone, saasProduct } =
      await request.json();

    if (!businessName || (!email && !phone) || !password || !name) {
      return apiError(
        "Business name, contact (email or phone), password, and name are required",
        400,
      );
    }

    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
      return apiError(passwordPolicyError, 400);
    }

    // Check if email or phone already exists
    const query: Record<string, any> = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (phone) {
      query.phone = phone;
    }
    
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return apiError(email ? "Email already registered" : "Phone number already registered", 409);
    }

    // Create tenant
    const slug = slugify(businessName) + "-" + Date.now().toString(36);
    const tenant = await Tenant.create({
      name: businessName,
      slug,
      email: email ? email.toLowerCase() : "",
      phone: phone || "",
      saasProduct: saasProduct || "retail",
    });

    // Create default branch
    const branch = await Branch.create({
      tenantId: tenant._id,
      name: "Main Branch",
      code: "MAIN",
      isMain: true,
    });

    // Create admin user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      tenantId: tenant._id,
      name,
      email: email ? email.toLowerCase() : "",
      password: hashedPassword,
      role: "admin",
      branchId: branch._id,
    });

    await setSession({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: user.role,
      branchId: branch._id.toString(),
      name: user.name,
    });

    return apiSuccess(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          saasProduct: tenant.saasProduct,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Sign up error:", error);
    return apiError("Internal server error", 500);
  }
}
