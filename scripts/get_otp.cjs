/* eslint-disable */
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const otpCollection = mongoose.connection.collection("otps");
  
  const otps = await otpCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("=== THE LATEST OTP IS ===");
  if (otps.length > 0) {
    console.log(`Identifier: ${otps[0].identifier}`);
    console.log(`OTP: ${otps[0].otp}`);
  } else {
    console.log("No OTPs found");
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
