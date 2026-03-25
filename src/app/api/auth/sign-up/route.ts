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
      query.phone = phone.replace(/\s+/g, "");
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
      phone: phone ? phone.replace(/\s+/g, "") : "",
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
    const verificationToken = email ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) : undefined;
    
    const user = await User.create({
      tenantId: tenant._id,
      name,
      email: email ? email.toLowerCase() : "",
      phone: phone ? phone.replace(/\s+/g, "") : "",
      password: hashedPassword,
      role: "admin",
      branchId: branch._id,
      emailVerified: true, // Auto-verify in development
      emailVerificationToken: verificationToken,
    });

    // Send verification email if email is provided
    if (email) {
      try {
        const { sendTenantEmail } = await import("@/lib/mailer");
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email.toLowerCase())}`;
        
        await sendTenantEmail({
          tenantId: tenant._id.toString(),
          to: email.toLowerCase(),
          subject: "Verify your email - Meka PoS",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Meka PoS!</h2>
              <p>Thank you for signing up for a trial. Please verify your email to get started.</p>
              <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
              <p style="margin-top: 24px; color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 14px;">${verificationLink}</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
        // We don't fail registration if email fails, but in a real app we might want to retry or alert the user.
      }
    }

    // Support instant login for all methods
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
