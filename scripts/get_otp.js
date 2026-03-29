const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const db = mongoose.connection.useDb("test"); // Try to get the right DB if it specifies one, or default
  const otpCollection = mongoose.connection.collection("otps");
  
  const otps = await otpCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("Recent OTPs:", otps);
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
