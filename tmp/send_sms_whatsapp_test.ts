import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function run() {
  const { africasTalkingService } = await import("../src/lib/africastalking");
  const { twilioService } = await import("../src/lib/twilio");
  const target = (process.env.TEST_RECIPIENT_PHONE || "").replace(/\s+/g, "");
  if (!target) {
    throw new Error("TEST_RECIPIENT_PHONE is required");
  }
  const smsText =
    "KashaPOS test SMS: If you received this, SMS delivery is working.";
  const waText =
    "KashaPOS test WhatsApp: If you received this, WhatsApp delivery is working.";

  console.log("Sending SMS via Africa's Talking to", target);
  try {
    const smsResult = await africasTalkingService.sendSMS(target, smsText);
    console.log("SMS result:", JSON.stringify(smsResult, null, 2));
  } catch (error: any) {
    console.error("SMS error:", error?.message || error);
  }

  console.log("Sending WhatsApp via Twilio to", target);
  try {
    const waResult = await twilioService.sendWhatsApp(target, waText);
    console.log("WhatsApp result:", JSON.stringify(waResult, null, 2));
  } catch (error: any) {
    console.error("WhatsApp error:", error?.message || error);
  }
}

run()
  .then(() => {
    console.log("Done");
  })
  .catch((error) => {
    console.error("Unexpected failure:", error);
    process.exitCode = 1;
  });
