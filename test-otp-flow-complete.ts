/**
 * Complete flow test: send-otp route with Nigerian phone number
 * Shows what happens with different Africa's Talking responses
 */

interface TestScenario {
  name: string;
  input: {
    identifier: string;
    method: "phone" | "whatsapp" | "email";
    purpose: "signup" | "reset";
  };
  africasTalkingResponse: {
    balance: string;
    smsStatus: string;
  };
  expectedFlow: string[];
  expectedOutput: {
    status: number;
    deliveryMethodUsed: string;
    warning?: string;
  };
}

function runTests() {
  const scenarios: TestScenario[] = [
    {
      name: "Success: SMS delivered to +234 9067953977",
      input: {
        identifier: "+234 9067953977",
        method: "phone",
        purpose: "reset",
      },
      africasTalkingResponse: {
        balance: "KES 150.00",
        smsStatus: "Sent",
      },
      expectedFlow: [
        "1. Validate input: identifier and method present ✅",
        "2. Query DB for existing user with phone +234 9067953977",
        "3. User found (purpose='reset') ✅",
        "4. Generate 6-digit OTP",
        "5. Save OTP to database (expires in 15 min)",
        "6. Check Africa's Talking balance → KES 150.00 ✅",
        "7. Attempt SMS send to +234 9067953977",
        "8. Africa's Talking returns: status='Sent' ✅",
        "9. Return success response",
      ],
      expectedOutput: {
        status: 200,
        deliveryMethodUsed: "phone",
      },
    },

    {
      name: "Fallback: SMS fails (InsufficientBalance) → Email sent",
      input: {
        identifier: "+234 9067953977",
        method: "phone",
        purpose: "reset",
      },
      africasTalkingResponse: {
        balance: "KES -0.50",
        smsStatus: "InsufficientBalance",
      },
      expectedFlow: [
        "1. Validate input: identifier and method present ✅",
        "2. Query DB for existing user with phone +234 9067953977",
        "3. User found (purpose='reset') ✅",
        "4. Generate 6-digit OTP",
        "5. Save OTP to database",
        "6. Check Africa's Talking balance → KES -0.50 ❌",
        "7. Log warning: 'balance insufficient'",
        "8. Attempt SMS anyway (balance check may be stale)",
        "9. Africa's Talking returns: status='InsufficientBalance' ❌",
        "10. Catch error and lookup user by phone",
        "11. Find user's email: 'user@example.com' ✅",
        "12. Send OTP email to 'user@example.com' ✅",
        "13. Return response with warning",
      ],
      expectedOutput: {
        status: 200,
        deliveryMethodUsed: "email",
        warning: "SMS delivery failed; OTP sent via email fallback.",
      },
    },

    {
      name: "Fallback: User has no email on file → Mock mode",
      input: {
        identifier: "+234 9067953977",
        method: "phone",
        purpose: "signup",
      },
      africasTalkingResponse: {
        balance: "KES 0.00",
        smsStatus: "InsufficientBalance",
      },
      expectedFlow: [
        "1. Validate input: identifier and method present ✅",
        "2. Query DB for user with phone +234 9067953977",
        "3. User NOT found (new signup) ❌",
        "4. No user on file yet - proceed with OTP generation",
        "5. Generate 6-digit OTP",
        "6. Save OTP to database",
        "7. Check Africa's Talking balance → KES 0.00 ❌",
        "8. Attempt SMS anyway",
        "9. Africa's Talking returns: status='InsufficientBalance' ❌",
        "10. Catch error and lookup user by phone",
        "11. User not found - no email available ❌",
        "12. Set mock=true (development mode)",
        "13. Include OTP in response for development",
      ],
      expectedOutput: {
        status: 200,
        deliveryMethodUsed: "email",
        warning:
          "SMS delivery failed and email not available on file. OTP: [123456]",
      },
    },

    {
      name: "WhatsApp cascade: WA fails → SMS succeeds",
      input: {
        identifier: "+234 9067953977",
        method: "whatsapp",
        purpose: "reset",
      },
      africasTalkingResponse: {
        balance: "KES 50.00",
        smsStatus: "Sent",
      },
      expectedFlow: [
        "1. Validate input and lookup user by phone ✅",
        "2. Generate OTP and save to DB",
        "3. Attempt WhatsApp via Twilio",
        "4. Twilio returns error (network issue, service issue) ❌",
        "5. Catch WhatsApp error",
        "6. Fallback to SMS: Check Africa's Talking balance → KES 50.00 ✅",
        "7. Attempt SMS send",
        "8. Africa's Talking returns: status='Sent' ✅",
        "9. Return success with fallback warning",
      ],
      expectedOutput: {
        status: 200,
        deliveryMethodUsed: "phone",
        warning: "WhatsApp delivery failed; OTP sent via SMS fallback.",
      },
    },

    {
      name: "WhatsApp cascade: WA & SMS fail → Email fallback",
      input: {
        identifier: "+234 9067953977",
        method: "whatsapp",
        purpose: "reset",
      },
      africasTalkingResponse: {
        balance: "KES 0.00",
        smsStatus: "InsufficientBalance",
      },
      expectedFlow: [
        "1. Validate input and lookup user by phone ✅",
        "2. Generate OTP and save to DB",
        "3. Attempt WhatsApp via Twilio ❌",
        "4. Catch WhatsApp error",
        "5. Fallback to SMS: Check Africa's Talking balance → KES 0.00 ❌",
        "6. Attempt SMS anyway",
        "7. Africa's Talking returns: InsufficientBalance ❌",
        "8. SMS fallback fails",
        "9. Lookup user by phone to get email",
        "10. Find user's email: 'user@example.com' ✅",
        "11. Send OTP email ✅",
        "12. Return response with full cascade warning",
      ],
      expectedOutput: {
        status: 200,
        deliveryMethodUsed: "email",
        warning:
          "WhatsApp and SMS delivery failed; OTP sent via email fallback.",
      },
    },
  ];

  console.log("=".repeat(90));
  console.log("COMPLETE OTP SEND FLOW TEST - Phone: +234 9067953977");
  console.log("=".repeat(90));

  scenarios.forEach((scenario, index) => {
    console.log(`\n${"█".repeat(90)}`);
    console.log(`TEST ${index + 1}: ${scenario.name}`);
    console.log(`${"█".repeat(90)}\n`);

    console.log("📥 INPUT:");
    console.log(`   Method: ${scenario.input.method}`);
    console.log(`   Identifier: ${scenario.input.identifier}`);
    console.log(`   Purpose: ${scenario.input.purpose}\n`);

    console.log("🔑 CONDITIONS:");
    console.log(
      `   Africa's Talking Balance: ${scenario.africasTalkingResponse.balance}`,
    );
    console.log(
      `   SMS Response Status: ${scenario.africasTalkingResponse.smsStatus}\n`,
    );

    console.log("🔄 EXECUTION FLOW:");
    scenario.expectedFlow.forEach((step) => {
      console.log(`   ${step}`);
    });

    console.log("\n📤 EXPECTED RESPONSE:");
    console.log(`   Status: ${scenario.expectedOutput.status}`);
    console.log(
      `   deliveryMethodUsed: "${scenario.expectedOutput.deliveryMethodUsed}"`,
    );
    if (scenario.expectedOutput.warning) {
      console.log(`   warning: "${scenario.expectedOutput.warning}"`);
    }
    console.log("");
  });

  console.log("=".repeat(90));
  console.log("TESTING WITH REAL CREDENTIALS:");
  console.log("=".repeat(90));

  console.log(`
To test the actual endpoint with your phone number:

1. Start the development server:
   npm run dev

2. Test SMS send (fastest to see the Africa's Talking response):
   
   curl -X POST http://localhost:3000/api/auth/send-otp \\
     -H "Content-Type: application/json" \\
     -d '{
       "identifier": "+234 9067953977",
       "method": "phone",
       "purpose": "reset"
     }'

3. Monitor server console for detailed logs:
   [Africa's Talking Application Data]: { UserData: { balance: "..." } }
   [Africa's Talking Response]: { SMSMessageData: { Recipients: [...] } }
   
4. Response will show which method was actually used:
   - deliveryMethodUsed: "phone" → SMS sent successfully
   - deliveryMethodUsed: "email" → SMS failed, fell back to email
   - warning: "SMS delivery failed..." → Fallback occurred

5. Check if OTP arrived via:
   - SMS (if balance was sufficient)
   - Email (if SMS failed)
   - Console logs (if in development mock mode)
`);

  console.log("=".repeat(90));
  console.log("✅ All test scenarios documented");
  console.log("=".repeat(90));
}

runTests();
