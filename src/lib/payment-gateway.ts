import type { ITenantSettings } from "@/models/Tenant";
import { PesapalService } from "@/lib/pesapal";
import { SiliconPayService } from "@/lib/silicon-pay";

export type GatewayProvider = "pesapal" | "silicon_pay";

export interface GatewayCustomer {
  name: string;
  email?: string;
  phone?: string;
}

export interface InitiateGatewayPaymentInput {
  paymentMethod: "card" | "mobile_money";
  saleNumber: string;
  amount: number;
  currency: string;
  customer: GatewayCustomer;
  callbackBaseUrl: string;
  paymentEmail?: string;
  mobileMoneyProvider?: "mtn" | "airtel";
  settings?: Partial<ITenantSettings> & {
    pesapalIpnId?: string;
    pesapalConsumerKey?: string;
    pesapalConsumerSecret?: string;
    siliconPayPublicKey?: string;
    siliconPayEncryptionKey?: string;
  };
}

export interface GatewayPaymentResult {
  provider: GatewayProvider;
  status: "initiated" | "skipped";
  reference?: string;
  checkoutUrl?: string;
  message?: string;
  raw?: unknown;
}

function extractUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;
  const candidates = [
    source.checkoutUrl,
    source.checkout_url,
    source.paymentUrl,
    source.payment_url,
    source.redirectUrl,
    source.redirect_url,
    source.url,
    nested?.checkoutUrl,
    nested?.checkout_url,
    nested?.payment_url,
    nested?.redirect_url,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function extractReference(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;
  const candidates = [
    source.orderTrackingId,
    source.order_tracking_id,
    source.transactionId,
    source.transaction_id,
    source.txRef,
    source.txId,
    source.reference,
    source.merchantReference,
    source.merchant_reference,
    nested?.orderTrackingId,
    nested?.order_tracking_id,
    nested?.transactionId,
    nested?.txRef,
    nested?.txId,
    nested?.reference,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function splitDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "Customer", lastName: "" };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function initiateGatewayPayment(
  input: InitiateGatewayPaymentInput,
): Promise<GatewayPaymentResult | null> {
  const settings = input.settings || {};
  const paymentEmail =
    input.paymentEmail?.trim() || input.customer.email?.trim();
  const customerName = input.customer.name.trim() || "Customer";
  const { firstName, lastName } = splitDisplayName(customerName);
  const pesapalConfigured =
    Boolean(settings.pesapalConsumerKey?.trim()) ||
    Boolean(process.env.PESAPAL_CONSUMER_KEY?.trim());
  const pesapalSecretConfigured =
    Boolean(settings.pesapalConsumerSecret?.trim()) ||
    Boolean(process.env.PESAPAL_CONSUMER_SECRET?.trim());
  const siliconPayConfigured =
    Boolean(settings.siliconPayPublicKey?.trim()) ||
    Boolean(process.env.SILICON_PAY_PUBLIC_KEY?.trim());
  const siliconPaySecretConfigured =
    Boolean(settings.siliconPayEncryptionKey?.trim()) ||
    Boolean(process.env.SILICON_PAY_ENCRYPTION_KEY?.trim());

  if (input.paymentMethod === "card") {
    if (!pesapalConfigured || !pesapalSecretConfigured) {
      return null;
    }
    if (!paymentEmail) {
      return null;
    }

    const notificationId =
      settings.pesapalIpnId ||
      (await PesapalService.registerIpn(
        `${input.callbackBaseUrl}/api/integrations/pesapal/callback`,
        settings,
      ));

    const response = await PesapalService.submitOrderRequest(
      {
        id: input.saleNumber,
        amount: input.amount,
        currency: input.currency,
        description: `Sale ${input.saleNumber}`,
        callback_url: `${input.callbackBaseUrl}/api/integrations/pesapal/callback`,
        notification_id: notificationId,
        billing_address: {
          email_address: paymentEmail,
          phone_number: input.customer.phone?.trim(),
          first_name: firstName,
          last_name: lastName,
        },
      },
      settings,
    );

    return {
      provider: "pesapal",
      status: "initiated",
      reference: extractReference(response) || input.saleNumber,
      checkoutUrl: extractUrl(response),
      message: "Pesapal checkout created",
      raw: response,
    };
  }

  if (input.paymentMethod === "mobile_money") {
    if (!siliconPayConfigured || !siliconPaySecretConfigured) {
      return null;
    }
    if (!paymentEmail) {
      return null;
    }
    if (!input.customer.phone?.trim()) {
      return null;
    }

    const response = await SiliconPayService.collect(
      {
        amount: input.amount,
        phoneNumber: input.customer.phone,
        email: paymentEmail,
        firstName,
        lastName,
        txId: input.saleNumber,
        reason: `Sale ${input.saleNumber}`,
        currency: input.currency,
        callbackUrl: `${input.callbackBaseUrl}/api/integrations/silicon-pay/callback`,
      },
      {
        siliconPayPublicKey: settings.siliconPayPublicKey,
        siliconPayEncryptionKey: settings.siliconPayEncryptionKey,
      },
    );

    return {
      provider: "silicon_pay",
      status: "initiated",
      reference: extractReference(response) || input.saleNumber,
      checkoutUrl: extractUrl(response),
      message: "Silicon Pay collection request sent",
      raw: response,
    };
  }

  return null;
}
