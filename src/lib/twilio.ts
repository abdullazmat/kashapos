import twilio from "twilio";

/**
 * Twilio Service for SMS and WhatsApp
 */

const TRANSIENT_TWILIO_CODES = new Set([20429]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const cleanEnv = (val: string | undefined): string => (val || "").trim().replace(/^['"]|['"]$/g, "").replace(/;+$/, "").trim();

class TwilioService {
  private client: any;

  constructor() {
    this.refreshClient();
  }

  private refreshClient() {
    const accSid = cleanEnv(process.env.TWILIO_ACCOUNT_SID);
    const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
    const apiKey = cleanEnv(process.env.TWILIO_API_KEY);
    const apiSecret = cleanEnv(process.env.TWILIO_API_SECRET);

    if (accSid && authToken) {
      this.client = twilio(accSid, authToken);
    } else if (accSid && apiKey && apiSecret) {
      this.client = twilio(apiKey, apiSecret, { accountSid: accSid });
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
        ? credentials.twilioAccountSid.trim()
        : cleanEnv(process.env.TWILIO_ACCOUNT_SID);
    const authToken =
      credentials?.twilioAuthToken && credentials.twilioAuthToken !== "********"
        ? credentials.twilioAuthToken.trim()
        : cleanEnv(process.env.TWILIO_AUTH_TOKEN);

    if (sid && authToken) {
      return twilio(sid, authToken);
    }

    const key =
      credentials?.twilioApiKey && credentials.twilioApiKey !== "********"
        ? credentials.twilioApiKey.trim()
        : cleanEnv(process.env.TWILIO_API_KEY);
    const secret =
      credentials?.twilioApiSecret && credentials.twilioApiSecret !== "********"
        ? credentials.twilioApiSecret.trim()
        : cleanEnv(process.env.TWILIO_API_SECRET);

    if (sid && key && secret) {
      return twilio(key, secret, { accountSid: sid });
    }
    
    if (!this.client) {
      this.refreshClient();
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
    if (!client) {
      throw new Error("Twilio client is not initialized. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment.");
    }
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
      return { success: false, message: "Twilio not configured (Check credentials)" };
    }

    const fromNumber =
      credentials?.twilioSmsNumber && credentials.twilioSmsNumber !== "********"
        ? credentials.twilioSmsNumber.trim()
        : cleanEnv(process.env.TWILIO_SMS_NUMBER);

    if (!fromNumber) {
      return {
        success: false,
        message: "TWILIO_SMS_NUMBER is required",
      };
    }

    let normalizedTo = to.replace(/[\s\-()]/g, "");
    if (normalizedTo.startsWith("0")) {
      normalizedTo = "+256" + normalizedTo.substring(1);
    } else if (normalizedTo.startsWith("7") && normalizedTo.length === 9) {
      normalizedTo = "+256" + normalizedTo;
    } else if (normalizedTo.startsWith("256") && !normalizedTo.startsWith("+")) {
      normalizedTo = "+" + normalizedTo;
    } else if (!normalizedTo.startsWith("+")) {
      normalizedTo = "+" + normalizedTo;
    }

    try {
      const resp = await this.createMessageWithRetry(client, {
        body: message,
        from: fromNumber,
        to: normalizedTo,
      });
      return { success: true, sid: resp.sid };
    } catch (error: any) {
      console.error("Twilio SMS failed:", error);
      throw new Error(`Twilio SMS failed: ${error.message} (Code: ${error.code})`);
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsApp(to: string, message: string, credentials?: any) {
    const client = this.getClient(credentials);
    if (!this.isEnabled(client)) {
      console.warn("Twilio not configured, WhatsApp not sent to:", to);
      return { success: false, message: "Twilio not configured (Check credentials)" };
    }

    const fromNumber =
      credentials?.twilioWhatsAppNumber &&
      credentials.twilioWhatsAppNumber !== "********"
        ? credentials.twilioWhatsAppNumber.trim()
        : cleanEnv(process.env.TWILIO_WHATSAPP_NUMBER);

    if (!fromNumber) {
      return {
        success: false,
        message: "TWILIO_WHATSAPP_NUMBER is required",
      };
    }

    try {
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const formattedFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

      const resp = await this.createMessageWithRetry(client, {
        body: message,
        from: formattedFrom,
        to: formattedTo,
      });
      return { success: true, sid: resp.sid };
    } catch (error: any) {
      console.error("Twilio WhatsApp failed:", error);
      throw new Error(`Twilio WhatsApp failed: ${error.message} (Code: ${error.code})`);
    }
  }
}

export const twilioService = new TwilioService();
