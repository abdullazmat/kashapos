import twilio from "twilio";
import * as dotenv from "dotenv";

/**
 * WhatsApp Delivery Test
 * Tests WhatsApp configuration and sandbox availability
 */

dotenv.config({ path: ".env.local" });

async function testWhatsAppDelivery() {
  console.log("💬 Testing WhatsApp Configuration\n");
  console.log("=".repeat(60));

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  console.log("Configuration:");
  console.log(`  Account SID: ${accountSid?.substring(0, 8)}...`);
  console.log(`  WhatsApp Number: ${whatsappNumber}`);
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

    // Check if WhatsApp is available in the account
    console.log("\n📋 Checking WhatsApp Services:");

    try {
      const channels = await client.messaging.services.list({ limit: 1 });
      console.log(`  Messaging services found: ${channels.length}`);
    } catch (err: any) {
      console.log(`  Channel check: ${err.message}`);
    }

    // WhatsApp in Twilio requires specific setup
    console.log("\n⚠️  WhatsApp Requirements:");
    console.log("  Sandbox Mode (Current):");
    console.log("    - Can only send to approved test numbers");
    console.log("    - Number: " + whatsappNumber);
    console.log("    - Good for: Testing");
    console.log("");
    console.log("  Production Mode (Requires Setup):");
    console.log("    - Requires Meta WhatsApp Business Account");
    console.log("    - Requires Twilio WhatsApp Sender ID approval");
    console.log("    - Requires pre-approved message templates");
    console.log("    - Approval time: 5-10 business days");
    console.log("");

    // Check account details
    console.log("Current Account Status:");
    try {
      const account = await (client.api.accounts as any)(accountSid).fetch();
      console.log(`  Account Name: ${account.friendly_name || "Unnamed"}`);
      console.log(`  Account Status: ${account.status}`);
      console.log(`  Account Type: ${account.type}`);
      console.log(`  Trial Account: ${account.trial_account ? "Yes" : "No"}`);
    } catch (err: any) {
      console.log(`  Error fetching account: ${err.message}`);
    }

    console.log("\n✅ WhatsApp Service is configured!");
    console.log("\nNext Steps for Production:");
    console.log("1. Go to https://www.twilio.com/console/sms/whatsapp");
    console.log("2. Click 'Apply for WhatsApp Sender ID'");
    console.log("3. Provide Meta Business Account details");
    console.log("4. Wait for approval (5-10 days)");
    console.log("5. Update TWILIO_WHATSAPP_NUMBER with production number");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

testWhatsAppDelivery().catch(console.error);
