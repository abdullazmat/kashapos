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
  const candidatePassword = process.env.SUPER_ADMIN_PASSWORD || "";
  const legacyPassword = process.env.LEGACY_SUPER_ADMIN_PASSWORD || "";

  const result = {
    email: "admin@kashapos.com",
    found: false,
    role: null,
    isActive: null,
    passwordMatches: {
      configuredPassword: false,
      legacyPassword: false,
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
  if (candidatePassword) {
    result.passwordMatches.configuredPassword = await bcrypt.compare(
      candidatePassword,
      user.password || "",
    );
  }
  if (legacyPassword) {
    result.passwordMatches.legacyPassword = await bcrypt.compare(
      legacyPassword,
      user.password || "",
    );
  }

  if (result.role !== "super_admin") {
    result.recommendation =
      "User exists but role is not super_admin. Update role to super_admin.";
  } else if (result.isActive === false) {
    result.recommendation = "User exists but is disabled. Set isActive=true.";
  } else if (result.passwordMatches.configuredPassword) {
    result.recommendation =
      "Use admin@kashapos.com with SUPER_ADMIN_PASSWORD from env.";
  } else if (result.passwordMatches.legacyPassword) {
    result.recommendation =
      "Use admin@kashapos.com with LEGACY_SUPER_ADMIN_PASSWORD from env.";
  } else {
    result.recommendation =
      "Password mismatch. Set SUPER_ADMIN_PASSWORD in env and re-run node create-superadmin.cjs.";
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
