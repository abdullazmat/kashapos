const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "manager", "cashier", "super_admin"], default: "cashier" },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  isActive: { type: Boolean, default: true },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function forceUpdateSuperAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kashapos");
  
  const email = "admin@kashapos.com";
  const password = "adminpassword";
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const existing = await User.findOne({ email });
  
  if (existing) {
    existing.password = hashedPassword;
    existing.role = "super_admin"; // Ensure role is correct
    await existing.save();
    console.log("UPDATED EXISTING ADMIN PASSWORD FOR:", email);
  } else {
    await User.create({
      name: "System Super Admin",
      email,
      password: hashedPassword,
      role: "super_admin",
      tenantId: new mongoose.Types.ObjectId(),
      isActive: true,
    });
    console.log("CREATED NEW SUPER ADMIN:", email);
  }
  
  console.log("FINAL PASSWORD SET TO:", password);
  process.exit(0);
}

forceUpdateSuperAdmin().catch(err => { console.error(err); process.exit(1); });
