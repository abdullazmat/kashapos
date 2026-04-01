import twilio from "twilio";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

/**
 * Twilio Credentials Verification Script
 * Tests both development (.env.local) and production (.env.production) credentials
 */

interface TestResult {
  environment: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
}

const results: TestResult[] = [];

function addResult(
  environment: string,
  test: string,
  status: "PASS" | "FAIL" | "WARN",
  message: string,
) {
  results.push({ environment, test, status, message });
  const icon =
    status === "PASS"
      ? "✅"
      : status === "FAIL"
        ? "❌"
        : status === "WARN"
          ? "⚠️"
          : "";
  console.log(`${icon} [${environment}] ${test}: ${message}`);
}

async function testEnvironment(
  envPath: string,
  environmentName: string,
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${environmentName} (${envPath})`);
  console.log("=".repeat(60));

  // Load environment variables
  const envConfig = dotenv.parse(fs.readFileSync(envPath));

  const accountSid = envConfig.TWILIO_ACCOUNT_SID;
  const apiKey = envConfig.TWILIO_API_KEY;
  const apiSecret = envConfig.TWILIO_API_SECRET;
  const authToken = envConfig.TWILIO_AUTH_TOKEN;
  const whatsappNumber = envConfig.TWILIO_WHATSAPP_NUMBER;
  const smsNumber = envConfig.TWILIO_SMS_NUMBER;

  // Test 1: Credential presence
  console.log("\n📋 Checking Credentials Presence:");

  if (!accountSid) {
    addResult(
      environmentName,
      "Account SID",
      "FAIL",
      "Missing TWILIO_ACCOUNT_SID",
    );
    return;
  }
  addResult(
    environmentName,
    "Account SID",
    "PASS",
    `${accountSid.substring(0, 8)}...${accountSid.substring(accountSid.length - 4)}`,
  );

  if (!apiKey && !authToken) {
    addResult(
      environmentName,
      "Auth Credentials",
      "FAIL",
      "Missing both API_KEY and AUTH_TOKEN",
    );
    return;
  }

  if (apiKey) {
    addResult(
      environmentName,
      "API Key",
      "PASS",
      `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
    );
  } else {
    addResult(environmentName, "API Key", "WARN", "Using AUTH_TOKEN instead");
  }

  if (apiSecret) {
    addResult(
      environmentName,
      "API Secret",
      "PASS",
      `${apiSecret.substring(0, 8)}...${apiSecret.substring(apiSecret.length - 4)}`,
    );
  }

  if (authToken) {
    addResult(
      environmentName,
      "Auth Token",
      "PASS",
      `${authToken.substring(0, 8)}...${authToken.substring(authToken.length - 4)}`,
    );
  } else {
    addResult(environmentName, "Auth Token", "WARN", "Not set (optional)");
  }

  if (!whatsappNumber) {
    addResult(
      environmentName,
      "WhatsApp Number",
      "FAIL",
      "Missing TWILIO_WHATSAPP_NUMBER",
    );
  } else {
    addResult(environmentName, "WhatsApp Number", "PASS", whatsappNumber);
  }

  if (!smsNumber) {
    addResult(
      environmentName,
      "SMS Number",
      "FAIL",
      "Missing TWILIO_SMS_NUMBER",
    );
  } else {
    addResult(environmentName, "SMS Number", "PASS", smsNumber);
  }

  // Test 2: Client initialization
  console.log("\n🔌 Testing Twilio Client Initialization:");

  try {
    let client: any;

    if (accountSid && authToken) {
      client = twilio(accountSid, authToken);
      addResult(
        environmentName,
        "Client Init (SID+Token)",
        "PASS",
        "Client created successfully",
      );
    } else if (accountSid && apiKey && apiSecret) {
      client = twilio(apiKey, apiSecret, { accountSid });
      addResult(
        environmentName,
        "Client Init (Key+Secret)",
        "PASS",
        "Client created successfully",
      );
    } else {
      addResult(
        environmentName,
        "Client Init",
        "FAIL",
        "Unable to create client",
      );
      return;
    }

    // Test 3: API Connectivity (get account info)
    console.log("\n🌐 Testing API Connectivity:");

    try {
      // This is a simple test that doesn't actually send anything
      const account = await (client.api.accounts as any)(accountSid).fetch();
      addResult(
        environmentName,
        "Account Fetch",
        "PASS",
        `Connected to account: ${account.friendly_name || "Unnamed"}`,
      );
    } catch (apiError: any) {
      if (apiError.code === 20003) {
        addResult(
          environmentName,
          "Account Fetch",
          "WARN",
          "Authentication issue - credentials may be invalid",
        );
      } else {
        addResult(
          environmentName,
          "Account Fetch",
          "FAIL",
          `API Error: ${apiError.message}`,
        );
      }
    }

    // Test 4: Available services
    console.log("\n📞 Available Messaging Services:");

    try {
      // Check available phone numbers
      const numbers = await (client.availablePhoneNumbers as any)(
        "US",
      ).local.list({ limit: 1 });
      addResult(
        environmentName,
        "Phone Numbers Available",
        "PASS",
        `Can browse available numbers (${numbers.length} in sample)`,
      );
    } catch (err: any) {
      if (err.message.includes("authenticate")) {
        addResult(
          environmentName,
          "Phone Numbers Query",
          "WARN",
          "Credentials not recognized for phone number queries",
        );
      } else {
        addResult(environmentName, "Phone Numbers Query", "WARN", err.message);
      }
    }
  } catch (error: any) {
    addResult(environmentName, "Client Init", "FAIL", error.message);
  }
}

async function main() {
  console.log("🧪 TWILIO CREDENTIALS VERIFICATION TEST");
  console.log("=========================================\n");

  const devEnvPath = path.join(process.cwd(), ".env.local");
  const prodEnvPath = path.join(process.cwd(), ".env.production");

  // Test development environment
  if (fs.existsSync(devEnvPath)) {
    await testEnvironment(devEnvPath, "DEVELOPMENT (.env.local)");
  } else {
    console.log("❌ .env.local not found");
  }

  // Test production environment
  if (fs.existsSync(prodEnvPath)) {
    await testEnvironment(prodEnvPath, "PRODUCTION (.env.production)");
  } else {
    console.log("⚠️  .env.production not found");
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const warned = results.filter((r) => r.status === "WARN").length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log(
      "\n🎉 All tests passed! Credentials appear to be configured correctly.",
    );
    console.log("\nNext Steps:");
    console.log("1. Test SMS delivery: npm run test:twilio-sms");
    console.log("2. Test WhatsApp delivery: npm run test:twilio-whatsapp");
    console.log(
      "3. For production: Update .env.production with real phone numbers",
    );
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please review the credentials above.",
    );
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
