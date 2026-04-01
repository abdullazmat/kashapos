import twilio from "twilio";
import * as dotenv from "dotenv";
import * as readline from "readline";

/**
 * Live WhatsApp Test - Send WhatsApp message to your phone
 */

const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env.production" : ".env.local";

console.log(`\n💬 SENDING LIVE WHATSAPP TEST`);
console.log(`Using Environment: ${env} (${envFile})`);
console.log("=".repeat(70) + "\n");

// Load environment
dotenv.config({ path: envFile });

async function sendTestWhatsApp(phoneNumber: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !fromNumber) {
    console.log("❌ Missing TWILIO_ACCOUNT_SID or TWILIO_WHATSAPP_NUMBER");
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

  // Format WhatsApp number
  const formattedTo = phoneNumber.startsWith("whatsapp:")
    ? phoneNumber
    : `whatsapp:${phoneNumber}`;

  try {
    console.log("📤 Sending WhatsApp message...");
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: ${formattedTo}`);
    console.log(
      `   Message: "Your KashaPOS verification test - WhatsApp working!"`,
    );
    console.log("");

    const message = await client.messages.create({
      body: "Your KashaPOS verification test - WhatsApp working! 🎉",
      from: fromNumber,
      to: formattedTo,
    });

    console.log("✅ WHATSAPP MESSAGE SENT SUCCESSFULLY!");
    console.log(`   SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Date Sent: ${message.date_sent}`);
    console.log("");
    console.log("📱 Check your WhatsApp for the message!");
    console.log("");
    return true;
  } catch (error: any) {
    console.log("❌ WHATSAPP MESSAGE FAILED!");
    console.log(`   Error Code: ${error.code}`);
    console.log(`   Error: ${error.message}`);
    console.log("");

    if (error.code === 70051) {
      console.log("⚠️  Authorization error (70051)");
      console.log("   Possible causes:");
      console.log("   • WhatsApp not enabled for this account");
      console.log("   • Number not verified with Meta");
      console.log("   • Sandbox mode - only approved test numbers work");
      console.log("   • Credentials mismatch");
    } else if (error.code === 20003) {
      console.log("⚠️  Invalid credentials");
    } else if (error.message.includes("Invalid")) {
      console.log("⚠️  Invalid phone number format");
      console.log(
        "   Ensure phone number includes country code (e.g., whatsapp:+92...)",
      );
    } else if (error.message.includes("not a WhatsApp-enabled")) {
      console.log("⚠️  This doesn't appear to be a WhatsApp-enabled number");
    }
    return false;
  }
}

async function main() {
  const phoneNumber = "+92 3175184327".replace(/\s+/g, ""); // Remove spaces: +923175184327

  console.log(`📲 Test Phone Number: ${phoneNumber}\n`);

  const result = await sendTestWhatsApp(phoneNumber);

  if (result) {
    console.log("=".repeat(70));
    console.log("✅ TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(70));
  } else {
    console.log("=".repeat(70));
    console.log("⚠️  WhatsApp test had issues - see errors above");
    console.log("=".repeat(70));
    console.log("\nℹ️  For production WhatsApp, you need:");
    console.log("   1. Meta WhatsApp Business Account verification");
    console.log("   2. Twilio WhatsApp Sender ID approval");
    console.log("   3. Pre-approved message templates");
  }
}

main().catch((err) => {
  console.error("💥 CRITICAL ERROR:", err);
  process.exit(1);
});
