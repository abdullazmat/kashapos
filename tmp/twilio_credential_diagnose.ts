import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config({ path: ".env.local" });
dotenv.config();

const sid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const apiKey = process.env.TWILIO_API_KEY || "";
const apiSecret = process.env.TWILIO_API_SECRET || "";
const waFrom = process.env.TWILIO_WHATSAPP_NUMBER || "";

function mask(v: string, visible = 4) {
  if (!v) return "<missing>";
  if (v.length <= visible) return "*".repeat(v.length);
  return `${v.slice(0, visible)}...(${v.length} chars)`;
}

async function testAuthTokenPath() {
  if (!sid || !authToken) {
    return { ok: false, reason: "missing sid or auth token" };
  }

  try {
    const client = twilio(sid, authToken);
    const acct = await client.api.v2010.accounts(sid).fetch();
    return {
      ok: true,
      accountSid: acct.sid,
      accountStatus: acct.status,
      accountType: acct.type,
      method: "account-sid-auth-token",
    };
  } catch (error: any) {
    return {
      ok: false,
      method: "account-sid-auth-token",
      code: error?.code,
      status: error?.status,
      message: error?.message,
      moreInfo: error?.moreInfo,
    };
  }
}

async function testApiKeyPath() {
  if (!sid || !apiKey || !apiSecret) {
    return { ok: false, reason: "missing sid or api key/secret" };
  }

  try {
    const client = twilio(apiKey, apiSecret, { accountSid: sid });
    const acct = await client.api.v2010.accounts(sid).fetch();
    return {
      ok: true,
      accountSid: acct.sid,
      accountStatus: acct.status,
      accountType: acct.type,
      method: "api-key-secret",
    };
  } catch (error: any) {
    return {
      ok: false,
      method: "api-key-secret",
      code: error?.code,
      status: error?.status,
      message: error?.message,
      moreInfo: error?.moreInfo,
    };
  }
}

async function main() {
  console.log("Twilio env summary:");
  console.log(
    JSON.stringify(
      {
        TWILIO_ACCOUNT_SID: mask(sid),
        TWILIO_AUTH_TOKEN: mask(authToken),
        TWILIO_API_KEY: mask(apiKey),
        TWILIO_API_SECRET: mask(apiSecret),
        TWILIO_WHATSAPP_NUMBER: waFrom || "<missing>",
        accountSidLooksValid: sid.startsWith("AC"),
        apiKeyLooksValid: apiKey ? apiKey.startsWith("SK") : false,
        whatsappNumberLooksValid: waFrom
          ? waFrom.startsWith("whatsapp:+")
          : false,
      },
      null,
      2,
    ),
  );

  const authTokenResult = await testAuthTokenPath();
  const apiKeyResult = await testApiKeyPath();

  console.log("\nAuth token path test:");
  console.log(JSON.stringify(authTokenResult, null, 2));

  console.log("\nAPI key path test:");
  console.log(JSON.stringify(apiKeyResult, null, 2));
}

main().catch((e) => {
  console.error("Unexpected diagnostic failure", e);
  process.exitCode = 1;
});
