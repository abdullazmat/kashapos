import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, default: null }, // Null handles 'Custom'
  currency: { type: String, default: "UGX" },
  period: { type: String, default: "/per month" },
  description: { type: String, required: true },
  features: [{ type: String }],
  ctaText: { type: String, default: "Get Started" },
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  maxBranches: { type: Number, default: null },
  maxUsers: { type: Number, default: null },
});
const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

async function run() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/kashapos",
  );

  // Clear any weird state
  await Plan.deleteMany({});

  const initialPlans = [
    {
      name: "Basic",
      price: 50000,
      period: "/per month",
      description: "Basic plan for small businesses",
      features: [
        "7-day free trial",
        "Up to 1 user",
        "Up to 1 branch",
        "Inventory tracking",
        "Sales management",
        "Purchase management",
        "Financial reports",
      ],
      ctaText: "Get Started",
      isPopular: true,
      order: 1,
      maxUsers: 1,
      maxBranches: 1,
    },
    {
      name: "Premium",
      price: 100000,
      period: "/per month",
      description: "Premium plan with unlimited features",
      features: [
        "7-day free trial",
        "Unlimited users",
        "Unlimited branches",
        "Inventory tracking",
        "Sales management",
        "Purchase management",
        "Financial reports",
        "Customer and supplier management",
        "Advanced security",
      ],
      ctaText: "Get Started",
      isPopular: false,
      order: 2,
      maxUsers: null,
      maxBranches: null,
    },
    {
      name: "Corporate",
      price: null,
      period: "",
      description:
        "Corporate plan for medium to large businesses with Payment and eFris integration",
      features: [
        "7-day free trial",
        "Unlimited users",
        "Up to 4 branches",
        "All Premium features",
        "Payment integration",
        "eFris integration",
        "Customer and supplier management",
        "Advanced security",
      ],
      ctaText: "Contact Sales",
      isPopular: false,
      order: 3,
      maxUsers: null,
      maxBranches: 4,
    },
    {
      name: "Enterprise",
      price: null,
      period: "",
      description:
        "Enterprise plan with full capabilities including Payment and eFris integration",
      features: [
        "7-day free trial",
        "All Corporate features",
        "Up to 7 branches",
        "Payment integration",
        "eFris integration",
        "Priority support",
        "Custom integrations",
        "Dedicated account manager",
      ],
      ctaText: "Contact Sales",
      isPopular: false,
      order: 4,
      maxUsers: null,
      maxBranches: 7,
    },
  ];

  await Plan.insertMany(initialPlans);
  console.log("SEEDED PLANS. Count: " + (await Plan.countDocuments()));
  process.exit(0);
}
run();
