import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import Branch from "@/models/Branch";
import { hashPassword, createToken, setSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { businessName, email, password, name, phone, saasProduct } =
      await request.json();

    if (!businessName || !email || !password || !name) {
      return NextResponse.json(
        { error: "Business name, email, password, and name are required" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    // Create tenant
    const slug = slugify(businessName) + "-" + Date.now().toString(36);
    const tenant = await Tenant.create({
      name: businessName,
      slug,
      email: email.toLowerCase(),
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
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      branchId: branch._id,
    });

    const token = await createToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: user.role,
      branchId: branch._id.toString(),
      name: user.name,
    });

    await setSession(token);

    return NextResponse.json(
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
      { status: 201 },
    );
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
