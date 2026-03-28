/**
 * Silicon Pay API Service
 */

const SILICON_PAY_URL = "https://silicon-pay.com/process_payments";
const PUBLIC_KEY = process.env.SILICON_PAY_PUBLIC_KEY || "";

export interface SiliconPayCollectionInput {
  amount: number;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  txId: string;
  reason: string;
  currency?: string;
  callbackUrl?: string;
}

export class SiliconPayService {
  /**
   * Initiates a Mobile Money collection request
   */
  static async collect(
    input: SiliconPayCollectionInput,
    credentials?: { siliconPayPublicKey?: string; siliconPayEncryptionKey?: string },
  ) {
    const pubKey = (credentials?.siliconPayPublicKey && credentials.siliconPayPublicKey !== "********") ? credentials.siliconPayPublicKey : PUBLIC_KEY;
    const encKey = (credentials?.siliconPayEncryptionKey && credentials.siliconPayEncryptionKey !== "********") 
      ? credentials.siliconPayEncryptionKey 
      : (process.env.SILICON_PAY_ENCRYPTION_KEY || "");

    if (!pubKey) {
      throw new Error("Silicon Pay public key not configured");
    }

    // Format phone number (ensure it starts with 256 for Uganda if not already)
    let formattedPhone = input.phoneNumber.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "256" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("256")) {
      formattedPhone = "256" + formattedPhone;
    }

    const payload = {
      public_key: pubKey,
      encryption_key: encKey,
      amount: input.amount,
      phone: formattedPhone,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      req: "mobile_money",
      txRef: input.txId,
      reason: input.reason,
      currency: input.currency || "UGX",
      call_back: (input.callbackUrl && !input.callbackUrl.includes("localhost")) 
        ? input.callbackUrl 
        : "https://yourpos.com/api/integrations/silicon-pay/callback", 
    };

    console.log("Silicon Pay Request Details:", {
      url: SILICON_PAY_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "KashaPOS/1.0",
      },
      body: {
        ...payload,
        encryption_key: "********", // REDACTED
      },
    });

    const response = await fetch(SILICON_PAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "KashaPOS/1.0",
      },
      body: JSON.stringify({
        ...payload,
        amount: String(payload.amount), // Some gateways prefer strings
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Silicon Pay Collection Failed: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Verifies a transaction status
   */
  static async getTransactionStatus(txId: string) {
    // Note: Silicon Pay usually checks via the callback or a specific status endpoint.
    // If there's a status endpoint, we'd use it here.
    // For now we'll assume the callback handles the truth.
    return { success: true, message: "Status check not implemented as per typical callback-only flow" };
  }
}
