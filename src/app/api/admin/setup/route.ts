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
        }
      });
    }

    // 2. Create Super Admin if not exists
    const adminEmail = "admin@kashapos.com";
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const password = await hashPassword("admin123");
      admin = await User.create({
        tenantId: systemTenant._id,
        name: "Master Admin",
        email: adminEmail,
        password: password,
        role: "super_admin",
        isActive: true,
        emailVerified: true
      });
    }

    // 3. Seed initial Plans from user's screenshot
    const existingPlans = await Plan.countDocuments();
    if (existingPlans === 0) {
      const initialPlans = [
        {
          name: "Basic",
          price: 50000,
          description: "Basic plan for small businesses",
          features: ["7-day free trial", "Up to 1 user", "Up to 1 branch", "Inventory tracking", "Sales management"],
          isPopular: true,
          order: 1,
          maxUsers: 1,
          maxBranches: 1
        },
        {
          name: "Premium",
          price: 100000,
          description: "Premium plan with unlimited features",
          features: ["7-day free trial", "Unlimited users", "Unlimited branches", "Advanced security"],
          isPopular: false,
          order: 2,
          maxUsers: null,
          maxBranches: null
        },
        {
          name: "Corporate",
          price: null, // Custom
          description: "Corporate plan for medium to large businesses with Payment integration",
          features: ["Payment integration", "eFris integration", "Up to 4 branches"],
          isPopular: false,
          order: 3,
          maxUsers: null,
          maxBranches: 4
        },
        {
          name: "Enterprise",
          price: null, // Custom
          description: "Enterprise plan with full capabilities and dedicated support",
          features: ["Priority support", "Custom integrations", "Dedicated account manager"],
          isPopular: false,
          order: 4,
          maxUsers: null,
          maxBranches: 7
        }
      ];

      await Plan.insertMany(initialPlans);
    }

    return apiSuccess({
      message: "System initialized successfully!",
      adminDetails: {
        email: adminEmail,
        password: "admin123 (Please change this immediately)"
      }
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return apiError(error.message, 500);
  }
}
