import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import Plan from "@/models/Plan";
import { hashPassword } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-helpers";

export async function GET() {
  try {
    await dbConnect();

    // 1. Create System Tenant if not exists
    let systemTenant = await Tenant.findOne({ slug: "kashpos-admin" });
    if (!systemTenant) {
      systemTenant = await Tenant.create({
        name: "KashaPOS Management",
        slug: "kashpos-admin",
        email: "system@kashapos.com",
        phone: "+256000000000",
        address: "Cloud System",
        plan: "enterprise",
        isActive: true,
        settings: {
          currency: "UGX",
          taxRate: 0,
          lowStockThreshold: 10,
        },
      });
    }

    // 2. Ensure Super Admin exists and is aligned
    const adminEmail = "admin@kashapos.com";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!adminPassword) {
      return apiError(
        "SUPER_ADMIN_PASSWORD is not configured in environment",
        500,
      );
    }
    const hashedAdminPassword = await hashPassword(adminPassword);

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      admin = await User.create({
        tenantId: systemTenant._id,
        name: "Master Admin",
        email: adminEmail,
        password: hashedAdminPassword,
        role: "super_admin",
        isActive: true,
        emailVerified: true,
      });
    } else {
      admin.tenantId = systemTenant._id;
      admin.role = "super_admin";
      admin.isActive = true;
      admin.password = hashedAdminPassword;
      await admin.save();
    }

    // 3. Seed initial Plans from user's screenshot
    const existingPlans = await Plan.countDocuments();
    if (existingPlans === 0) {
      const initialPlans = [
        {
          name: "Basic",
          price: 50000,
          description: "Basic plan for small businesses",
          features: [
            "7-day free trial",
            "Up to 1 user",
            "Up to 1 branch",
            "Inventory tracking",
            "Sales management",
          ],
          isPopular: true,
          order: 1,
          maxUsers: 1,
          maxBranches: 1,
        },
        {
          name: "Premium",
          price: 100000,
          description: "Premium plan with unlimited features",
          features: [
            "7-day free trial",
            "Unlimited users",
            "Unlimited branches",
            "Advanced security",
          ],
          isPopular: false,
          order: 2,
          maxUsers: null,
          maxBranches: null,
        },
        {
          name: "Corporate",
          price: null, // Custom
          description:
            "Corporate plan for medium to large businesses with Payment integration",
          features: [
            "Payment integration",
            "eFris integration",
            "Up to 4 branches",
          ],
          isPopular: false,
          order: 3,
          maxUsers: null,
          maxBranches: 4,
        },
        {
          name: "Enterprise",
          price: null, // Custom
          description:
            "Enterprise plan with full capabilities and dedicated support",
          features: [
            "Priority support",
            "Custom integrations",
            "Dedicated account manager",
          ],
          isPopular: false,
          order: 4,
          maxUsers: null,
          maxBranches: 7,
        },
      ];

      await Plan.insertMany(initialPlans);
    }

    return apiSuccess({
      message: "System initialized successfully!",
      adminDetails: {
        email: adminEmail,
        password: `${adminPassword} (Please change this immediately)`,
      },
    });
  } catch (error: unknown) {
    console.error("Setup error:", error);
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}
