import dotenv from "dotenv";
import mongoose from "mongoose";
import twilio from "twilio";

const TARGET_RAW = "+92 3175184327";
const TARGET = TARGET_RAW.replace(/\s+/g, "");

type UserLite = {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  tenantId?: unknown;
};

async function findInDb(uri: string, dbName: string, phoneVariants: string[]) {
  const conn = await mongoose.createConnection(`${uri}/${dbName}`).asPromise();
  try {
    const users = (await conn
      .collection("users")
      .find({ phone: { $in: phoneVariants } })
      .project({ name: 1, email: 1, phone: 1, tenantId: 1 })
      .toArray()) as UserLite[];
    return users;
  } finally {
    await conn.close();
  }
}

async function sendTwilioHello(phone: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const apiKey = process.env.TWILIO_API_KEY || "";
  const apiSecret = process.env.TWILIO_API_SECRET || "";
  const smsFrom = process.env.TWILIO_SMS_NUMBER || "+14155238886";
  const waFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  let client: any;
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  } else if (accountSid && apiKey && apiSecret) {
    client = twilio(apiKey, apiSecret, { accountSid });
  } else {
    throw new Error("Twilio credentials are missing");
  }

  console.log("\nSending Twilio SMS: 'Hello'");
  try {
    const sms = await client.messages.create({
      body: "Hello",
      from: smsFrom,
      to: phone,
    });
    console.log("SMS accepted by API:", { sid: sms.sid, status: sms.status });
  } catch (error: any) {
    console.log("SMS failed:", { code: error?.code, message: error?.message });
  }

  console.log("\nSending Twilio WhatsApp: 'Hello'");
  try {
    const wa = await client.messages.create({
      body: "Hello",
      from: waFrom,
      to: `whatsapp:${phone}`,
    });
    console.log("WhatsApp accepted by API:", {
      sid: wa.sid,
      status: wa.status,
    });
  } catch (error: any) {
    console.log("WhatsApp failed:", {
      code: error?.code,
      message: error?.message,
    });
  }
}

async function main() {
  dotenv.config({ path: ".env.production" });

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  const variants = [TARGET_RAW, TARGET, TARGET.replace(/^\+/, "")];
  console.log("Checking registration for:", TARGET_RAW, "=>", TARGET);

  // Check likely DBs used in this repo.
  const [kashaposUsers, testUsers] = await Promise.all([
    findInDb(uri, "kashapos", variants),
    findInDb(uri, "test", variants),
  ]);

  const all = [
    ...kashaposUsers.map((u) => ({ db: "kashapos", ...u })),
    ...testUsers.map((u) => ({ db: "test", ...u })),
  ];

  if (all.length === 0) {
    console.log(
      "\nRESULT: NOT REGISTERED in users collection (kashapos/test).",
    );
    console.log(
      "No message sent because you asked to send only if registered.",
    );
    return;
  }

  console.log(`\nRESULT: REGISTERED (${all.length} match(es))`);
  all.forEach((u, i) => {
    console.log(
      `${i + 1}. db=${u.db} name=${u.name || "N/A"} email=${u.email || "N/A"} phone=${u.phone || "N/A"}`,
    );
  });

  await sendTwilioHello(TARGET);
}

main().catch((err) => {
  console.error("Fatal:", err?.message || err);
  process.exitCode = 1;
});
