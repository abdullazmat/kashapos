const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const outPath = path.join(
  process.cwd(),
  "tmp",
  "admin_login_diagnose_result.json",
);

const userSchema = new mongoose.Schema(
  {
    tenantId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    password: String,
    role: String,
    isActive: Boolean,
  },
  { strict: false },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function main() {
  const result = {
    email: "admin@kashapos.com",
    found: false,
    role: null,
    isActive: null,
    passwordMatches: {
      adminpassword: false,
      admin123: false,
    },
    recommendation: "",
  };

  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/kashapos",
  );

  const user = await User.findOne({ email: "admin@kashapos.com" }).lean();

  if (!user) {
    result.recommendation =
      "No admin user found. Run: node create-superadmin.cjs";
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    await mongoose.disconnect();
    return;
  }

  result.found = true;
  result.role = user.role || null;
  result.isActive = user.isActive ?? null;
  result.passwordMatches.adminpassword = await bcrypt.compare(
    "adminpassword",
    user.password || "",
  );
  result.passwordMatches.admin123 = await bcrypt.compare(
    "admin123",
    user.password || "",
  );

  if (result.role !== "super_admin") {
    result.recommendation =
      "User exists but role is not super_admin. Update role to super_admin.";
  } else if (result.isActive === false) {
    result.recommendation = "User exists but is disabled. Set isActive=true.";
  } else if (result.passwordMatches.adminpassword) {
    result.recommendation = "Use admin@kashapos.com with adminpassword.";
  } else if (result.passwordMatches.admin123) {
    result.recommendation =
      "Use admin@kashapos.com with admin123 (setup default).";
  } else {
    result.recommendation =
      "Password mismatch. Re-run node create-superadmin.cjs to reset to adminpassword.";
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  fs.writeFileSync(
    outPath,
    JSON.stringify({ error: String(err?.message || err) }, null, 2),
  );
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
