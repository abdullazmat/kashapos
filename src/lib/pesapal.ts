/**
 * Pesapal V3 API Service
 */

const PESAPAL_URL = process.env.PESAPAL_API_URL || "https://cybqa.pesapal.com/pesapalv3/api";
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
}

export class PesapalService {
  private static async getAuthToken(): Promise<string> {
    const response = await fetch(`${PESAPAL_URL}/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Pesapal Auth Failed: ${JSON.stringify(error)}`);
    }

    const data: PesapalAuthResponse = await response.json();
    return data.token;
  }

  /**
   * Registers a URL for Instant Payment Notifications (IPN)
   */
  static async registerIpn(callbackUrl: string): Promise<string> {
    const token = await this.getAuthToken();
    const response = await fetch(`${PESAPAL_URL}/URLRegister/RegisterIPN`, {
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
      const error = await response.json();
      throw new Error(`Pesapal IPN Registration Failed: ${JSON.stringify(error)}`);
    }

    const data: PesapalIpnResponse = await response.json();
    return data.ipn_id;
  }

  /**
   * Initiates a payment request
   */
  static async submitOrderRequest(orderData: {
    id: string;
    amount: number;
    description: string;
    callback_url: string;
    notification_id: string;
    billing_address: {
      email_address: string;
      phone_number?: string;
      first_name?: string;
      last_name?: string;
    };
  }) {
    const token = await this.getAuthToken();
    const response = await fetch(`${PESAPAL_URL}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Pesapal Order Submission Failed: ${JSON.stringify(error)}`);
    }

    return await response.json();
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
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }
}
