import mongoose from "mongoose";

async function run() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to cluster");

    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log(
      "DBs:",
      dbs.databases.map((d) => d.name),
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
