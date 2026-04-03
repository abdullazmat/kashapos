import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

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

async function createSuperAdmin() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/kashapos",
  );

  const email = "admin@kashapos.com";
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD is not set");
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email, role: "super_admin" });
  if (existing) {
    console.log("Super Admin already exists at", email);
    process.exit(0);
  }

  // Create a placeholder tenantId if none exists (required for the model logic)
  const superAdmin = await User.create({
    name: "System Super Admin",
    email,
    password: hashedPassword,
    role: "super_admin",
    tenantId: new mongoose.Types.ObjectId(), // Virtual tenant for system-wide access
    isActive: true,
  });

  console.log("CREATED SUPER ADMIN:", email, "Password:", password);
  process.exit(0);
}

createSuperAdmin().catch(console.error);
