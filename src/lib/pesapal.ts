/**
 * Pesapal V3 API Service
 */

const PESAPAL_URL =
  process.env.PESAPAL_API_URL || "https://cybqa.pesapal.com/pesapalv3/api";
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";

export interface PesapalAuthResponse {
  token: string;
  expiryDate: string;
  status: string;
  message: string;
}

export interface PesapalIpnResponse {
  url: string;
  created_date: string;
  ipn_id: string;
  notification_type: number;
  status?: string;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
}

export class PesapalService {
  private static async getAuthToken(credentials?: {
    pesapalConsumerKey?: string;
    pesapalConsumerSecret?: string;
  }): Promise<string> {
    const key = (
      credentials?.pesapalConsumerKey &&
      credentials.pesapalConsumerKey !== "********"
        ? credentials.pesapalConsumerKey
        : CONSUMER_KEY
    ).trim();
    const secret = (
      credentials?.pesapalConsumerSecret &&
      credentials.pesapalConsumerSecret !== "********"
        ? credentials.pesapalConsumerSecret
        : CONSUMER_SECRET
    ).trim();

    const url = PESAPAL_URL.replace(/\/$/, "") + "/Auth/RequestToken";

    console.log("Pesapal Token Request:", {
      url,
      consumer_key: key,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        consumer_key: key,
        consumer_secret: secret,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Pesapal Auth Error Response:", err);
      throw new Error(`Pesapal Auth Failed: ${err}`);
    }

    const data: any = await response.json();
    console.log("Pesapal Token Response Body:", JSON.stringify(data));

    // Some APIs (like Pesapal) might return HTTP 200 but an error INSIDE the JSON
    if (data.status && String(data.status) !== "200") {
      const errMsg =
        data.error?.message || data.message || "Unknown Pesapal API error";
      const errCode = data.error?.code || data.code || "unknown_error";
      throw new Error(
        `Pesapal API Error (${data.status}): ${errCode} - ${errMsg}`,
      );
    }

    // Some versions or variants might use token, access_token, or CaseVariations
    const token =
      data.token ||
      data.access_token ||
      data.Token ||
      data.Access_token ||
      data.AccessToken;

    if (!token) {
      throw new Error(
        `Pesapal Authentication Failed: No token present in response. ${JSON.stringify(data)}`,
      );
    }

    return token;
  }

  /**
   * Registers a URL for Instant Payment Notifications (IPN)
   */
  static async registerIpn(
    callbackUrl: string,
    credentials?: any,
  ): Promise<string> {
    const token = await this.getAuthToken(credentials);

    if (!token) {
      throw new Error("Pesapal Auth Failed: No token received from provider");
    }

    const url = PESAPAL_URL.replace(/\/$/, "") + "/URLSetup/RegisterIPN";
    console.log("Pesapal IPN Register Request:", {
      url,
      token: token.substring(0, 10) + "...",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: callbackUrl,
        ipn_notification_type: "GET",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Pesapal IPN Register Error Response:", errText);
      try {
        const error = JSON.parse(errText);
        throw new Error(
          `Pesapal IPN Registration Failed: ${JSON.stringify(error)}`,
        );
      } catch {
        throw new Error(`Pesapal IPN Registration Failed: ${errText}`);
      }
    }

    const data: PesapalIpnResponse = await response.json();

    if (data.status && String(data.status) !== "200") {
      const errMsg =
        data.error?.message || data.message || "IPN registration failed";
      const errCode = data.error?.code || "unknown_error";
      throw new Error(
        `Pesapal IPN Registration Failed (${data.status}): ${errCode} - ${errMsg}`,
      );
    }

    if (!data.ipn_id) {
      throw new Error(
        `Pesapal IPN Registration Failed: missing ipn_id in response ${JSON.stringify(data)}`,
      );
    }

    return data.ipn_id;
  }

  /**
   * Initiates a payment request
   */
  static async submitOrderRequest(
    orderData: {
      id: string;
      amount: number;
      currency: string;
      description: string;
      callback_url: string;
      notification_id: string;
      billing_address: {
        email_address: string;
        phone_number?: string;
        first_name?: string;
        last_name?: string;
      };
    },
    credentials?: any,
  ) {
    const token = await this.getAuthToken(credentials);
    const response = await fetch(
      `${PESAPAL_URL.replace(/\/$/, "")}/Transactions/SubmitOrderRequest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Pesapal Order Submission Failed: ${JSON.stringify(error)}`,
      );
    }

    const data: any = await response.json();
    console.log("Pesapal SubmitOrderRequest Response:", JSON.stringify(data));

    if (data?.status && String(data.status) !== "200") {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        "Pesapal order submission failed";
      const errCode = data?.error?.code || data?.code || "unknown_error";
      throw new Error(
        `Pesapal Order Submission Failed (${data.status}): ${errCode} - ${errMsg}`,
      );
    }

    return data;
  }

  /**
   * Gets the status of a transaction
   */
  static async getTransactionStatus(trackingId: string) {
    const token = await this.getAuthToken();
    const response = await fetch(
      `${PESAPAL_URL}/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }
}
