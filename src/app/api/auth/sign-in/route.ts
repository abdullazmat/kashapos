import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import { verifyPassword, createToken, setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 },
      );
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: "Business account is inactive" },
        { status: 403 },
      );
    }

    const token = await createToken({
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branchId?.toString(),
      name: user.name,
    });

    await setSession(token);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
