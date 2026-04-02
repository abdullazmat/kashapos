import twilio from "twilio";

/**
 * Twilio Service for SMS and WhatsApp
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const API_KEY = process.env.TWILIO_API_KEY || "";
const API_SECRET = process.env.TWILIO_API_SECRET || "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "";
const SMS_NUMBER = process.env.TWILIO_SMS_NUMBER || "";

const TRANSIENT_TWILIO_CODES = new Set([20429]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  private async createMessageWithRetry(
    client: any,
    payload: { body: string; from: string; to: string },
  ) {
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await client.messages.create(payload);
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status || 0);
        const code = Number(error?.code || 0);
        const isTransient =
          TRANSIENT_TWILIO_CODES.has(code) || status >= 500 || status === 429;
        if (!isTransient || attempt === 3) break;
        await sleep(250 * attempt);
      }
    }
    throw lastError;
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

    const fromNumber =
      credentials?.twilioSmsNumber && credentials.twilioSmsNumber !== "********"
        ? credentials.twilioSmsNumber
        : SMS_NUMBER;
    if (!fromNumber) {
      return {
        success: false,
        message: "TWILIO_SMS_NUMBER is required",
      };
    }

    try {
      const resp = await this.createMessageWithRetry(client, {
        body: message,
        from: fromNumber,
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

    const fromNumber =
      credentials?.twilioWhatsAppNumber &&
      credentials.twilioWhatsAppNumber !== "********"
        ? credentials.twilioWhatsAppNumber
        : WHATSAPP_NUMBER;
    if (!fromNumber) {
      return {
        success: false,
        message: "TWILIO_WHATSAPP_NUMBER is required",
      };
    }

    try {
      // Format destination number if needed for WhatsApp (e.g. whatsapp:+256...)
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

      const resp = await this.createMessageWithRetry(client, {
        body: message,
        from: fromNumber,
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
