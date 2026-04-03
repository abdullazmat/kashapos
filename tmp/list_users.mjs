import mongoose from "mongoose";

async function run() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const users = await mongoose.connection.db
      .collection("users")
      .find({})
      .limit(5)
      .toArray();
    console.log(
      "Sample users:",
      users.map((u) => ({ email: u.email, name: u.name, _id: u._id })),
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
