import mongoose from "mongoose";

async function run() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const result = await mongoose.connection.db.collection("users").updateMany(
      {}, // All users
      { $set: { emailVerified: true, emailVerificationToken: null } },
    );

    console.log(`Verified ${result.matchedCount} users found in the database.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
