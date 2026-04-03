const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "manager", "cashier", "super_admin"],
    default: "cashier",
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  isActive: { type: Boolean, default: true },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

const tenantSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    email: String,
    phone: String,
    address: String,
    plan: String,
    isActive: Boolean,
    settings: mongoose.Schema.Types.Mixed,
  },
  { strict: false },
);

const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);

async function forceUpdateSuperAdmin() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/kashapos",
  );

  const email = "admin@kashapos.com".toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD is not set");
  }
  const hashedPassword = await bcrypt.hash(password, 12);

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

  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = "super_admin"; // Ensure role is correct
    existing.tenantId = systemTenant._id;
    existing.isActive = true;
    await existing.save();
    console.log("UPDATED EXISTING ADMIN PASSWORD FOR:", email);
  } else {
    await User.create({
      name: "System Super Admin",
      email,
      password: hashedPassword,
      role: "super_admin",
      tenantId: systemTenant._id,
      isActive: true,
    });
    console.log("CREATED NEW SUPER ADMIN:", email);
  }

  console.log("FINAL PASSWORD SET TO:", password);
  process.exit(0);
}

forceUpdateSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
