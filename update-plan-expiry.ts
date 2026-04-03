import mongoose from "mongoose";
import Tenant from "@/models/Tenant";
import User from "@/models/User";

async function updatePlanExpiry() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find user by email
    const user = await User.findOne({ email: "basic@poscloud.me" }).select(
      "tenantId email",
    );
    if (!user) {
      console.error("User basic@poscloud.me not found");
      process.exit(1);
    }

    console.log(`Found user: ${user.email}, tenantId: ${user.tenantId}`);

    // Update tenant's planExpiry to May 3, 2026
    const mayThird2026 = new Date(2026, 4, 3); // Month is 0-indexed, so 4 = May
    const result = await Tenant.findByIdAndUpdate(
      user.tenantId,
      { $set: { planExpiry: mayThird2026 } },
      { new: true },
    ).select("name plan planExpiry");

    console.log(`Updated tenant: ${result?.name}`);
    console.log(`Plan: ${result?.plan}`);
    console.log(`New Expiry: ${result?.planExpiry}`);

    await mongoose.connection.close();
    console.log("Done");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updatePlanExpiry();
