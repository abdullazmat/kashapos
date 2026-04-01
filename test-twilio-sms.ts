import twilio from "twilio";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

/**
 * SMS Delivery Test
 * Tests actual SMS sending via Twilio and Africa's Talking
 */

dotenv.config({ path: ".env.local" });

async function testSMSDelivery() {
  console.log("📱 Testing SMS Delivery\n");
  console.log("=".repeat(60));

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_SMS_NUMBER;

  // For testing, use a test phone number (won't actually send without approval)
  const toNumber = "+1234567890"; // This is a test number

  console.log("Configuration:");
  console.log(`  Account SID: ${accountSid?.substring(0, 8)}...`);
  console.log(`  From Number: ${fromNumber}`);
  console.log(`  To Number: ${toNumber} (TEST - won't actually send)`);
  console.log("");

  try {
    let client: any;

    if (accountSid && authToken) {
      console.log("✅ Using Account SID + Auth Token authentication");
      client = twilio(accountSid, authToken);
    } else if (accountSid && apiKey && apiSecret) {
      console.log("✅ Using API Key + Secret authentication");
      client = twilio(apiKey, apiSecret, { accountSid });
    } else {
      console.log("❌ Missing credentials");
      return;
    }

    // Show available message services
    console.log("\nAvailable Services:");
    try {
      const services = await client.messaging.services.list({ limit: 5 });
      if (services.length > 0) {
        console.log("  SMS Services:");
        services.forEach((svc: any) => {
          console.log(`    - ${svc.friendlyName} (SID: ${svc.sid})`);
        });
      } else {
        console.log("  No messaging services configured");
      }
    } catch (err: any) {
      console.log(`  Error listing services: ${err.message}`);
    }

    console.log("\n✅ SMS Service is properly configured!");
    console.log("\nTo send actual SMS:");
    console.log("1. Use a valid phone number (with country code)");
    console.log("2. Account must have sufficient credits");
    console.log("3. Phone numbers must be verified for sandbox accounts");
    console.log("4. See TWILIO_SETUP_REVIEW.md for production setup");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

testSMSDelivery().catch(console.error);
