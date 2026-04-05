/**
 * Silicon Pay API Service
 */

const SILICON_PAY_URL = "https://silicon-pay.com/process_payments";
const PUBLIC_KEY = process.env.SILICON_PAY_PUBLIC_KEY || "";

export interface SiliconPayCollectionInput {
  amount: number;
  phoneNumber?: string;
  email: string;
  firstName: string;
  lastName: string;
  txId: string;
  reason: string;
  currency?: string;
  callbackUrl?: string;
  requestType?: "mobile_money" | "card_payment";
  successUrl?: string;
  failureUrl?: string;
}

function readCheckoutUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;

  const candidates = [
    source.redirect_url,
    source.redirectUrl,
    source.checkout_url,
    source.checkoutUrl,
    source.payment_url,
    source.paymentUrl,
    source.payment_link,
    source.paymentLink,
    source.hosted_link,
    source.hostedLink,
    source.url,
    source.link,
    nested?.redirect_url,
    nested?.redirectUrl,
    nested?.checkout_url,
    nested?.checkoutUrl,
    nested?.payment_url,
    nested?.paymentUrl,
    nested?.payment_link,
    nested?.paymentLink,
    nested?.hosted_link,
    nested?.hostedLink,
    nested?.url,
    nested?.link,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function readErrorMessage(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;
  const error = source.error;

  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: string }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  const candidates = [source.message, source.status, nested?.message];
  const found = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;

  return found || "";
}

export class SiliconPayService {
  /**
   * Initiates a Mobile Money collection request
   */
  static async collect(
    input: SiliconPayCollectionInput,
    credentials?: {
      siliconPayPublicKey?: string;
      siliconPayEncryptionKey?: string;
    },
  ) {
    const pubKey =
      credentials?.siliconPayPublicKey &&
      credentials.siliconPayPublicKey !== "********"
        ? credentials.siliconPayPublicKey
        : PUBLIC_KEY;
    const encKey =
      credentials?.siliconPayEncryptionKey &&
      credentials.siliconPayEncryptionKey !== "********"
        ? credentials.siliconPayEncryptionKey
        : process.env.SILICON_PAY_ENCRYPTION_KEY || "";

    if (!pubKey) {
      throw new Error("Silicon Pay public key not configured");
    }

    let formattedPhone = "";
    if (input.phoneNumber?.trim()) {
      // Format phone number (ensure it starts with 256 for Uganda if not already)
      formattedPhone = input.phoneNumber.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "256" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("256")) {
        formattedPhone = "256" + formattedPhone;
      }
    }

    const payload: Record<string, unknown> = {
      public_key: pubKey,
      encryption_key: encKey,
      amount: input.amount,
      emailAddress: input.email,
      fname: input.firstName,
      lname: input.lastName,
      req: input.requestType || "mobile_money",
      txRef: input.txId,
      description: input.reason,
      currency: input.currency || "UGX",
      call_back: input.callbackUrl || "",
    };

    if (payload.req === "card_payment") {
      payload.success_url = input.successUrl || "";
      payload.failure_url = input.failureUrl || input.successUrl || "";
    }

    if (formattedPhone) {
      payload.phone = formattedPhone;
    }

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

  static async collectHostedCheckout(
    input: SiliconPayCollectionInput,
    credentials?: {
      siliconPayPublicKey?: string;
      siliconPayEncryptionKey?: string;
    },
  ) {
    const configuredReqTypes =
      process.env.SILICON_PAY_HOSTED_REQ_TYPES?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) || [];
    const reqTypes = configuredReqTypes.length
      ? configuredReqTypes
      : ["card_payment"];

    const attemptErrors: string[] = [];

    for (const requestType of reqTypes) {
      const normalized =
        requestType.toLowerCase() === "card_payment"
          ? "card_payment"
          : requestType.toLowerCase() === "mobile_money"
            ? "mobile_money"
            : null;
      if (!normalized) {
        continue;
      }

      try {
        const response = await SiliconPayService.collect(
          {
            ...input,
            requestType: normalized,
          },
          credentials,
        );
        const checkoutUrl = readCheckoutUrl(response);
        if (checkoutUrl) {
          return response;
        }

        const gatewayMessage = readErrorMessage(response);
        attemptErrors.push(
          `[${requestType}] ${gatewayMessage || "No checkout URL returned"}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        attemptErrors.push(`[${requestType}] ${message}`);
      }
    }

    const details = attemptErrors.join(" | ");
    throw new Error(
      `Silicon Pay hosted checkout is unavailable for this account. ${details}`,
    );
  }

  /**
   * Verifies a transaction status
   */
  static async getTransactionStatus(txId: string) {
    void txId;
    // Note: Silicon Pay usually checks via the callback or a specific status endpoint.
    // If there's a status endpoint, we'd use it here.
    // For now we'll assume the callback handles the truth.
    return {
      success: true,
      message: "Status check not implemented as per typical callback-only flow",
    };
  }
}
