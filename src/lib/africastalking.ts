import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const AT_USERNAME = process.env.AT_USERNAME || "";
const AT_API_KEY = process.env.AT_API_KEY || "";
const AT_SENDER_ID = process.env.AT_SENDER_ID || "";

class AfricasTalkingService {
  private sms: unknown;
  private isConfigured: boolean = false;

  constructor() {
    const username = (process.env.AT_USERNAME || "").trim();
    const apiKey = (process.env.AT_API_KEY || "").trim();

    if (username && apiKey) {
      try {
        // Safe require since there are no official types
        const africastalking = require("africastalking");
        const at = africastalking({
          apiKey: apiKey,
          username: username,
        });
        this.sms = at.SMS;
        this.isConfigured = true;
      } catch (error) {
        console.error("Failed to initialize Africa's Talking SDK", error);
      }
    }
  }

  private getSmsClient(credentials?: {
    atUsername?: string;
    atApiKey?: string;
  }) {
    const username =
      credentials?.atUsername && credentials.atUsername !== "********"
        ? credentials.atUsername
        : AT_USERNAME;
    const apiKey =
      credentials?.atApiKey && credentials.atApiKey !== "********"
        ? credentials.atApiKey
        : AT_API_KEY;

    if (username && apiKey) {
      try {
        const africastalking = require("africastalking");
        const at = africastalking({
          apiKey: apiKey,
          username: username,
        });
        return at.SMS;
      } catch (error) {
        console.error(
          "Failed to initialize Africa's Talking SDK with provided credentials",
          error,
        );
      }
    }
    return this.sms;
  }

  async sendSMS(to: string, message: string, credentials?: Record<string, string>) {
    const smsClient = this.getSmsClient(credentials);
    if (!smsClient && !this.isConfigured) {
      console.warn("Africa's Talking not configured, SMS not sent to:", to);
      return { success: false, message: "Africa's Talking not configured" };
    }

    try {
      const senderId =
        credentials?.atSenderId && credentials.atSenderId !== "********"
          ? credentials.atSenderId
          : AT_SENDER_ID;
      let normalizedTo = to.replace(/[\s\-()]/g, "");
      // Ugandan phone normalization for Africa's Talking
      if (normalizedTo.startsWith("0")) {
        normalizedTo = "+256" + normalizedTo.substring(1);
      } else if (normalizedTo.startsWith("7") && normalizedTo.length === 9) {
        normalizedTo = "+256" + normalizedTo;
      } else if (normalizedTo.startsWith("256") && !normalizedTo.startsWith("+")) {
        normalizedTo = "+" + normalizedTo;
      } else if (!normalizedTo.startsWith("+")) {
        // Fallback for other formats, try adding +
        normalizedTo = "+" + normalizedTo;
      }
      const options = {
        to: [normalizedTo],
        message: message,
        ...(senderId ? { from: senderId } : {}),
      };

      const response = await (smsClient as { send: (options: unknown) => Promise<unknown> }).send(options) as {
        SMSMessageData?: {
          Recipients: { status: string; cost?: string }[];
        };
      };

      // SMS response received

      if (
        response &&
        response.SMSMessageData &&
        response.SMSMessageData.Recipients
      ) {
        const recipient = response.SMSMessageData.Recipients[0];

        // Check for specific error statuses
        if (recipient.status === "InsufficientBalance") {
          const errorMsg = `Africa's Talking: Insufficient balance (Cost: ${recipient.cost || "unknown"})`;
          console.error(errorMsg);
          return { success: false, message: errorMsg, error: recipient.status };
        }

        if (recipient.status !== "Success" && recipient.status !== "Sent") {
          const errorMsg = `Africa's Talking SMS Delivery Failed with status: ${recipient.status} (Cost: ${recipient.cost || "unknown"})`;
          console.error(errorMsg);
          return { success: false, message: errorMsg, error: recipient.status };
        }
      }

      return { success: true, data: response };
    } catch (error: unknown) {
      console.error("Africa's Talking SMS error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  }

  async getBalance(credentials?: Record<string, string>) {
    const username =
      credentials?.atUsername && credentials.atUsername !== "********"
        ? credentials.atUsername
        : AT_USERNAME;
    const apiKey =
      credentials?.atApiKey && credentials.atApiKey !== "********"
        ? credentials.atApiKey
        : AT_API_KEY;

    if (username && apiKey) {
      try {
        const africastalking = require("africastalking");
        const at = africastalking({
          apiKey: apiKey,
          username: username,
        });
        const data = await at.APPLICATION.fetchApplicationData();
        // Balance data received
        return data.UserData.balance;
      } catch (error: unknown) {
        console.error("Failed to fetch Africa's Talking balance", error);
        throw new Error(
          `Failed to fetch balance: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
      }
    }
    throw new Error("Africa's Talking credentials not found");
  }
}

export const africasTalkingService = new AfricasTalkingService();
