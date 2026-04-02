import twilio from "twilio";
import * as dotenv from "dotenv";
import * as readline from "readline";

/**
 * Live SMS Test - Send SMS to your phone number
 */

const env = process.env.NODE_ENV || "development";
const envFile = ".env";

console.log(`\n📱 SENDING LIVE SMS TEST`);
console.log(`Using Environment: ${env} (${envFile})`);
console.log("=".repeat(70) + "\n");

// Load environment
dotenv.config({ path: envFile });

async function sendTestSMS(phoneNumber: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_SMS_NUMBER;

  if (!accountSid || !fromNumber) {
    console.log("❌ Missing TWILIO_ACCOUNT_SID or TWILIO_SMS_NUMBER");
    return;
  }

  if (!authToken && !apiKey) {
    console.log("❌ Missing both TWILIO_AUTH_TOKEN and TWILIO_API_KEY");
    return;
  }

  let client: any;
  if (accountSid && authToken) {
    console.log("✅ Using Account SID + Auth Token\n");
    client = twilio(accountSid, authToken);
  } else if (accountSid && apiKey && apiSecret) {
    console.log("✅ Using API Key + Secret\n");
    client = twilio(apiKey, apiSecret, { accountSid });
  }

  try {
    console.log("📤 Sending SMS...");
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: ${phoneNumber}`);
    console.log(`   Message: "Your KashaPOS verification test - SMS working!"`);
    console.log("");

    const message = await client.messages.create({
      body: "Your KashaPOS verification test - SMS working! 🎉",
      from: fromNumber,
      to: phoneNumber,
    });

    console.log("✅ SMS SENT SUCCESSFULLY!");
    console.log(`   SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Date Sent: ${message.date_sent}`);
    console.log("");
    console.log("📱 Check your phone for the SMS!");
    console.log("");
    return true;
  } catch (error: any) {
    console.log("❌ SMS FAILED!");
    console.log(`   Error Code: ${error.code}`);
    console.log(`   Error: ${error.message}`);
    console.log("");

    if (error.code === 70051) {
      console.log("⚠️  Authorization error - may be sandbox account");
      console.log("   Sandbox accounts can only send to verified numbers");
    } else if (error.code === 20003) {
      console.log("⚠️  Invalid credentials");
    } else if (error.message.includes("Invalid")) {
      console.log("⚠️  Invalid phone number format");
      console.log(
        "   Make sure phone number includes country code (e.g., +92...)",
      );
    }
    return false;
  }
}

async function main() {
  const phoneNumber = (process.env.TEST_RECIPIENT_PHONE || "").replace(
    /\s+/g,
    "",
  );

  if (!phoneNumber) {
    console.log("❌ TEST_RECIPIENT_PHONE is required to send SMS test");
    console.log(
      "   Example: TEST_RECIPIENT_PHONE=+256700000000 npm run send:sms",
    );
    process.exit(1);
  }

  console.log(`📲 Test Phone Number: ${phoneNumber}\n`);

  const result = await sendTestSMS(phoneNumber);

  if (result) {
    console.log("=".repeat(70));
    console.log("✅ TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(70));
    console.log("\nNext: Test WhatsApp with: npm run send:whatsapp");
  } else {
    console.log("=".repeat(70));
    console.log("⚠️  SMS test had issues - see errors above");
    console.log("=".repeat(70));
  }
}

main().catch((err) => {
  console.error("💥 CRITICAL ERROR:", err);
  process.exit(1);
});
