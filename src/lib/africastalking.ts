/**
 * Africa's Talking Service for SMS
 */

const USERNAME = process.env.AT_USERNAME || "";
const API_KEY = process.env.AT_API_KEY || "";

class AfricasTalkingService {
  private isEnabled() {
    return !!(USERNAME && API_KEY);
  }

  /**
   * Send SMS via Africa's Talking
   */
  async sendSMS(to: string, message: string, credentials?: { atUsername?: string, atApiKey?: string }) {
    const user = (credentials?.atUsername && credentials.atUsername !== "********") ? credentials.atUsername : USERNAME;
    const key = (credentials?.atApiKey && credentials.atApiKey !== "********") ? credentials.atApiKey : API_KEY;

    if (!user || !key) {
      console.warn("Africa's Talking not configured, SMS not sent to:", to);
      return { success: false, message: "Africa's Talking not configured" };
    }

    if (!to) {
      return { success: false, message: "Phone number is required" };
    }

    try {
      // Numbers must be in international format (e.g. +256...)
      const formattedTo = to.startsWith("+") ? to : `+${to}`;

      const params = new URLSearchParams();
      params.append("username", user);
      params.append("to", formattedTo);
      params.append("message", message);

      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": key,
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        console.error("Africa's Talking SMS failed:", data);
        return { success: false, error: data };
      }
    } catch (error: any) {
      console.error("Africa's Talking fetch error:", error);
      throw new Error(`Africa's Talking SMS failed: ${error.message}`);
    }
  }
}

export const africasTalkingService = new AfricasTalkingService();
