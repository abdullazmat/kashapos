/**
 * Direct Africa's Talking SMS test
 * Sends a test message to a phone number and displays the full API response
 */

import { africasTalkingService } from "./src/lib/africastalking.ts";

async function sendTestSMS() {
  const phoneNumber = "+234 9067953977";
  const message = "Hello from Meka PoS - Testing SMS delivery";

  console.log("=".repeat(70));
  console.log("AFRICA'S TALKING SMS TEST");
  console.log("=".repeat(70));
  console.log(`\n📱 Sending SMS to: ${phoneNumber}`);
  console.log(`💬 Message: "${message}"\n`);

  try {
    // First, check balance
    console.log("1️⃣ Checking Africa's Talking Balance...");
    try {
      const balance = await africasTalkingService.getBalance();
      console.log(`   ✅ Current Balance: ${balance}\n`);
    } catch (balanceError: any) {
      console.log(`   ⚠️ Could not check balance: ${balanceError.message}\n`);
    }

    // Send SMS
    console.log("2️⃣ Sending SMS...");
    const result = await africasTalkingService.sendSMS(phoneNumber, message);

    console.log("3️⃣ API Response:\n");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n" + "=".repeat(70));
    if (result.success) {
      console.log("✅ SMS SENT SUCCESSFULLY!");
      console.log("   Status: Message delivered");
    } else {
      console.log("❌ SMS DELIVERY FAILED!");
      console.log(`   Error: ${result.message}`);
      if (result.error) {
        console.log(`   Status Code: ${result.error}`);
      }
    }
    console.log("=".repeat(70));
  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
  }
}

sendTestSMS();
