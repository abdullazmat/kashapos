import twilio from "twilio";
import * as dotenv from "dotenv";

/**
 * Twilio Message Status Tracker
 * Check the delivery status of messages sent from Twilio
 */

dotenv.config({ path: ".env.production" });

async function checkMessageStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log("❌ Missing credentials");
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    console.log("📊 Checking last 10 messages...\n");
    console.log("=".repeat(70));

    // Get last 10 messages
    const messages = await client.messages.list({ limit: 10 });

    if (messages.length === 0) {
      console.log("⚠️  No messages found in account");
      return;
    }

    console.log(`Found ${messages.length} messages:\n`);

    messages.forEach((msg: any, index: number) => {
      console.log(`${index + 1}. Message SID: ${msg.sid}`);
      console.log(`   From: ${msg.from}`);
      console.log(`   To: ${msg.to}`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Body: ${msg.body?.substring(0, 50)}...`);
      console.log(`   Date Sent: ${msg.date_sent}`);
      console.log(`   Error Code: ${msg.error_code || "None"}`);
      console.log(`   Error Message: ${msg.error_message || "None"}`);
      console.log("");
    });

    console.log("=".repeat(70));
    console.log("\n📝 Status Legend:");
    console.log("   queued     - Message waiting to be sent");
    console.log("   sending    - Message being sent");
    console.log("   sent       - Message sent successfully");
    console.log("   delivered  - Message delivered to phone");
    console.log("   failed     - Message failed to send");
    console.log("   undelivered - Message couldn't be delivered");
  } catch (error: any) {
    console.error("❌ Error checking messages:", error.message);
  }
}

async function checkAccountStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log("❌ Missing credentials");
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    console.log("\n🔍 Checking Account Status...\n");
    console.log("=".repeat(70));

    const account = await client.api.accounts(accountSid).fetch();

    console.log(`Account SID: ${account.sid}`);
    console.log(`Friendly Name: ${account.friendlyName || "N/A"}`);
    console.log(`Status: ${account.status}`);
    console.log(`Type: ${account.type}`);
    console.log(`Auth Token Status: Active (since we're connected)`);

    console.log("\n=".repeat(70));
  } catch (error: any) {
    console.error("❌ Error checking account:", error.message);
  }
}

async function checkPhoneNumbers() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log("❌ Missing credentials");
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    console.log("\n📱 Checking Purchased Phone Numbers...\n");
    console.log("=".repeat(70));

    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 10 });

    if (phoneNumbers.length === 0) {
      console.log("⚠️  No phone numbers found");
      console.log("    Your account is using shared SMS sandox numbers");
      console.log("    To send real SMS, purchase a phone number");
      return;
    }

    console.log(`Found ${phoneNumbers.length} phone numbers:\n`);

    phoneNumbers.forEach((num: any) => {
      console.log(`Phone Number: ${num.phone_number}`);
      console.log(`  Friendly Name: ${num.friendly_name}`);
      console.log(`  SMS Capable: ${num.sms_fallback_method || "N/A"}`);
      console.log(`  MMS Capable: ${num.mms_fallback_method || "N/A"}`);
      console.log("");
    });

    console.log("=".repeat(70));
  } catch (error: any) {
    console.error("❌ Error checking phone numbers:", error.message);
  }
}

async function main() {
  console.log("🔧 TWILIO DEBUGGING - MESSAGE STATUS & ACCOUNT CHECK");
  console.log("=".repeat(70));
  console.log("");

  await checkMessageStatus();
  await checkAccountStatus();
  await checkPhoneNumbers();

  console.log("\n💡 TROUBLESHOOTING TIPS:");
  console.log("=".repeat(70));
  console.log("");
  console.log("If messages are 'queued' but not arriving:");
  console.log("1. Check if your phone number is WhatsApp-verified");
  console.log("2. Check if you've verified test numbers in Twilio console");
  console.log("3. Wait 2-3 minutes for delivery (can be slow on trial)");
  console.log("4. Check Twilio Activity Log: https://www.twilio.com/console");
  console.log("");
  console.log("If getting 'failed' status:");
  console.log("1. Check error code and message above");
  console.log("2. Verify phone number format (+country code)");
  console.log("3. Check regional restrictions");
  console.log("4. Verify account has credits/balance");
  console.log("");
  console.log("For WhatsApp specifically:");
  console.log("1. Number must be WhatsApp-enabled in Twilio");
  console.log('2. Must have "Approve test numbers" setup in console');
  console.log("3. Sandbox numbers only work with registered test numbers");
  console.log("");
}

main().catch(console.error);
