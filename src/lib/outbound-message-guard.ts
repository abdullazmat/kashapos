import { checkRateLimit } from "./rate-limit";

type GuardSettings = {
  outboundMessageGuardEnabled?: boolean;
  outboundMessageLimit?: number;
  outboundMessageWindowMinutes?: number;
};

function normalizeRecipient(recipient?: string) {
  return (recipient || "").trim().toLowerCase().replace(/\s+/g, "");
}

export function checkOutboundMessageGuard(input: {
  tenantId: string;
  channel: string;
  recipient?: string;
  settings?: GuardSettings | null;
  now?: number;
}) {
  const settings = input.settings || {};
  if (!settings.outboundMessageGuardEnabled) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const limit = Math.max(1, Math.floor(settings.outboundMessageLimit || 10));
  const windowMinutes = Math.max(
    1,
    Math.floor(settings.outboundMessageWindowMinutes || 60),
  );
  const recipientKey = normalizeRecipient(input.recipient) || "global";

  return checkRateLimit({
    key: `outbound_message_${input.tenantId}_${input.channel}_${recipientKey}`,
    limit,
    windowMs: windowMinutes * 60 * 1000,
    now: input.now,
  });
}
