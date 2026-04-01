/**
 * Simulated Africa's Talking SMS Response Test
 * Demonstrates the fixed behavior with various response scenarios
 */

interface SMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

function simulateAfricasTalkingResponse(scenario: string): SMSResponse {
  const responses: Record<string, SMSResponse> = {
    // Success Case
    success: {
      success: true,
      data: {
        SMSMessageData: {
          Message: "Sent to 1/1 Total Cost: KES 0.8",
          Recipients: [
            {
              cost: "0.8",
              messageId: "ATXid_1234567890",
              number: "+234 9067953977",
              status: "Sent",
              statusCode: 0,
            },
          ],
        },
      },
    },

    // Insufficient Balance
    insufficientBalance: {
      success: false,
      message: "Africa's Talking: Insufficient balance (Cost: 0)",
      error: "InsufficientBalance",
    },

    // Invalid Number
    invalidNumber: {
      success: false,
      message:
        "Africa's Talking SMS Delivery Failed with status: InvalidDestinationAddress (Cost: 0)",
      error: "InvalidDestinationAddress",
    },

    // Network/API Error
    networkError: {
      success: false,
      message: "Africa's Talking SMS failed: Network timeout after 30s",
    },

    // Queued (will be delivered)
    queued: {
      success: true,
      data: {
        SMSMessageData: {
          Message: "Sent to 1/1 Total Cost: KES 0.8",
          Recipients: [
            {
              cost: "0.8",
              messageId: "ATXid_1234567891",
              number: "+234 9067953977",
              status: "Queued",
              statusCode: 1,
            },
          ],
        },
      },
    },
  };

  return responses[scenario] || responses.success;
}

function testAfricasTalkingResponses() {
  console.log("=".repeat(80));
  console.log("AFRICA'S TALKING SMS API RESPONSE TEST");
  console.log("Phone: +234 9067953977 | Message: 'Hello from Meka PoS'");
  console.log("=".repeat(80));

  const scenarios = [
    {
      scenario: "success",
      title: "✅ SUCCESS - SMS Delivered",
      description: "Message successfully sent to the number",
    },
    {
      scenario: "queued",
      title: "⏳ QUEUED - SMS Pending",
      description: "Message queued for delivery (will be delivered shortly)",
    },
    {
      scenario: "insufficientBalance",
      title: "❌ INSUFFICIENT BALANCE",
      description: "Africa's Talking account has insufficient balance for SMS",
    },
    {
      scenario: "invalidNumber",
      title: "❌ INVALID NUMBER",
      description:
        "Phone number format invalid or not supported in Nigeria (+234)",
    },
    {
      scenario: "networkError",
      title: "❌ NETWORK ERROR",
      description: "Connection to Africa's Talking API failed",
    },
  ];

  scenarios.forEach(({ scenario, title, description }) => {
    console.log(`\n${title}`);
    console.log(`└─ ${description}\n`);

    const response = simulateAfricasTalkingResponse(scenario);
    console.log("API Response:");
    console.log(JSON.stringify(response, null, 2));

    console.log("\n" + "─".repeat(80));
  });

  console.log("\n" + "=".repeat(80));
  console.log("EXPECTED BEHAVIOR WITH OUR FIX:");
  console.log("=".repeat(80));

  console.log(
    "\n📱 Scenario: SMS delivery fails, user found with email on file",
  );
  console.log(`   Request: POST /api/auth/send-otp`);
  console.log(`   Body: { identifier: "+234 9067953977", method: "phone" }`);
  console.log(`\n   Flow:`);
  console.log(`   1. Check Africa's Talking balance → Insufficient ⚠️`);
  console.log(`   2. Attempt SMS send anyway (balance check may be stale)`);
  console.log(`   3. SMS fails: "InsufficientBalance" ❌`);
  console.log(`   4. Catch error → Lookup User by phone "+234 9067953977"`);
  console.log(`   5. Find user's email: "user@example.com" ✅`);
  console.log(`   6. Send OTP to "user@example.com" ✅`);
  console.log(`\n   Status: 200 OK`);
  console.log(`   Response:`);
  console.log(
    JSON.stringify(
      {
        message: "OTP sent successfully",
        deliveryMethodUsed: "email",
        warning: "SMS delivery failed; OTP sent via email fallback.",
        mock: false,
      },
      null,
      2,
    ),
  );
  console.log(`\n   User receives OTP ✅`);

  console.log("\n" + "=".repeat(80));
  console.log("HOW TO TEST WITH REAL CREDENTIALS:");
  console.log("=".repeat(80));

  console.log(`
1. Start the development server:
   npm run dev

2. Make API request in browser or with curl:
   curl -X POST http://localhost:3000/api/auth/send-otp \\
     -H "Content-Type: application/json" \\
     -d '{
       "identifier": "+234 9067953977",
       "method": "phone",
       "purpose": "reset"
     }'

3. Check the response and server logs for:
   - [Africa's Talking Application Data]: { UserData: { balance: "..." } }
   - [Africa's Talking Response]: { SMSMessageData: { Recipients: [...] } }
   - "Phone SMS delivery via Africa's Talking failed, falling back to email:"
   - "deliveryWarning = 'SMS delivery failed; OTP sent via email fallback.'"

4. Verify email was sent to the user's registered email address
`);
}

testAfricasTalkingResponses();
