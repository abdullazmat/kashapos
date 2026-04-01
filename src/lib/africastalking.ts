import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const AT_USERNAME = process.env.AT_USERNAME || "sandbox";
const AT_API_KEY = process.env.AT_API_KEY || "";
const AT_SENDER_ID = process.env.AT_SENDER_ID || "";

class AfricasTalkingService {
  private sms: any;
  private isConfigured: boolean = false;

  constructor() {
    if (AT_USERNAME && AT_API_KEY) {
      try {
        // Safe require since there are no official types
        const africastalking = require("africastalking");
        const at = africastalking({
          apiKey: AT_API_KEY,
          username: AT_USERNAME,
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

  async sendSMS(to: string, message: string, credentials?: any) {
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
      const normalizedTo = to.replace(/[\s\-()]/g, "");
      const options = {
        to: [normalizedTo],
        message: message,
        ...(senderId ? { from: senderId } : {}),
      };

      const response = await smsClient.send(options);

      console.log(
        "[Africa's Talking Response]:",
        JSON.stringify(response, null, 2),
      );

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
    } catch (error: any) {
      console.error("Africa's Talking SMS error:", error);
      return {
        success: false,
        message: error.message || JSON.stringify(error),
      };
    }
  }

  async getBalance(credentials?: any) {
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
        console.log(
          "[Africa's Talking Application Data]:",
          JSON.stringify(data, null, 2),
        );
        return data.UserData.balance;
      } catch (error: any) {
        console.error("Failed to fetch Africa's Talking balance", error);
        throw new Error(
          `Failed to fetch balance: ${error.message || JSON.stringify(error)}`,
        );
      }
    }
    throw new Error("Africa's Talking credentials not found");
  }
}

export const africasTalkingService = new AfricasTalkingService();
