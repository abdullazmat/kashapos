import twilio from "twilio";

/**
 * Twilio Service for SMS and WhatsApp
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const API_KEY = process.env.TWILIO_API_KEY || "";
const API_SECRET = process.env.TWILIO_API_SECRET || "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const WHATSAPP_NUMBER =
  process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
const SMS_NUMBER = process.env.TWILIO_SMS_NUMBER || "+14155238886";

class TwilioService {
  private client: any;

  constructor() {
    if (ACCOUNT_SID && AUTH_TOKEN) {
      // Prefer Account SID + Auth Token for the broadest compatibility.
      this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    } else if (ACCOUNT_SID && API_KEY && API_SECRET) {
      this.client = twilio(API_KEY, API_SECRET, { accountSid: ACCOUNT_SID });
    }
  }

  private getClient(credentials?: {
    twilioAccountSid?: string;
    twilioApiKey?: string;
    twilioApiSecret?: string;
    twilioAuthToken?: string;
  }) {
    const sid =
      credentials?.twilioAccountSid &&
      credentials.twilioAccountSid !== "********"
        ? credentials.twilioAccountSid
        : ACCOUNT_SID;
    const key =
      credentials?.twilioApiKey && credentials.twilioApiKey !== "********"
        ? credentials.twilioApiKey
        : API_KEY;
    const secret =
      credentials?.twilioApiSecret && credentials.twilioApiSecret !== "********"
        ? credentials.twilioApiSecret
        : API_SECRET;
    const authToken =
      credentials?.twilioAuthToken && credentials.twilioAuthToken !== "********"
        ? credentials.twilioAuthToken
        : AUTH_TOKEN;

    if (sid && authToken) {
      return twilio(sid, authToken);
    }

    if (sid && key && secret) {
      return twilio(key, secret, {
        accountSid: sid,
      });
    }
    return this.client;
  }

  private isEnabled(client?: any) {
    return !!(client || this.client);
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to: string, message: string, credentials?: any) {
    const client = this.getClient(credentials);
    if (!this.isEnabled(client)) {
      console.warn("Twilio not configured, SMS not sent to:", to);
      return { success: false, message: "Twilio not configured" };
    }

    try {
      const resp = await client.messages.create({
        body: message,
        from: credentials?.twilioSmsNumber || SMS_NUMBER,
        to: to,
      });
      return { success: true, sid: resp.sid };
    } catch (error: any) {
      console.error("Twilio SMS failed:", error);
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsApp(to: string, message: string, credentials?: any) {
    const client = this.getClient(credentials);
    if (!this.isEnabled(client)) {
      console.warn("Twilio not configured, WhatsApp not sent to:", to);
      return { success: false, message: "Twilio not configured" };
    }

    try {
      // Format destination number if needed for WhatsApp (e.g. whatsapp:+256...)
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

      const resp = await client.messages.create({
        body: message,
        from: credentials?.twilioWhatsAppNumber || WHATSAPP_NUMBER,
        to: formattedTo,
      });
      return { success: true, sid: resp.sid };
    } catch (error: any) {
      console.error("Twilio WhatsApp failed:", error);
      if (error?.code === 70051) {
        throw new Error(
          "Twilio WhatsApp authorization failed (70051). Verify credentials belong to the same Twilio account and use TWILIO_AUTH_TOKEN or a properly scoped API Key/Secret.",
        );
      }
      throw new Error(`Twilio WhatsApp failed: ${error.message}`);
    }
  }
}

export const twilioService = new TwilioService();
