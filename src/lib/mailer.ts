import nodemailer from "nodemailer";
import { Resend } from "resend";
import Tenant from "@/models/Tenant";

export type MailProvider =
  | "sendgrid"
  | "mailgun"
  | "smtp"
  | "postmark"
  | "resend";

type SendTenantEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  settings?: any; // Optional override settings
};

// Default Resend API key provided by user
const DEFAULT_RESEND_KEY = "re_hPcsz2Ao_CVv84NqyQFZzUudkfjS85w7B";

function parsePort(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveSmtpConfig(overrides?: {
  host?: string;
  port?: number | string;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}) {
  const host = overrides?.host || process.env.SMTP_HOST;
  const user = overrides?.user || process.env.SMTP_USER;
  const pass = overrides?.pass || process.env.SMTP_PASS;
  const port = parsePort(overrides?.port || process.env.SMTP_PORT, 587);
  const fromEmail =
    overrides?.fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = overrides?.fromName || "Meka PoS";

  return {
    host,
    user,
    pass,
    port,
    fromEmail,
    fromName,
    isConfigured: Boolean(host && user && pass),
  };
}

async function sendViaSmtp({
  to,
  subject,
  html,
  text,
  replyTo,
  smtp,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  smtp: ReturnType<typeof resolveSmtpConfig>;
}) {
  if (!smtp.host || !smtp.user || !smtp.pass) {
    throw new Error("SMTP is not fully configured");
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to,
    replyTo,
    subject,
    text,
    html,
  });

  return { id: "smtp-success", mock: false };
}

export async function sendSystemEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const provider = process.env.EMAIL_PROVIDER;
  const smtp = resolveSmtpConfig({ fromName: "Meka PoS" });

  // Prefer SMTP whenever env credentials exist, even if EMAIL_PROVIDER is unset.
  if (smtp.isConfigured && provider !== "resend") {
    return sendViaSmtp({
      to,
      subject,
      html,
      smtp,
    });
  }

  // If provider is explicitly resend but SMTP is available, still use SMTP to avoid
  // Resend domain verification restrictions when no domain is configured.
  if (smtp.isConfigured && provider === "resend") {
    return sendViaSmtp({
      to,
      subject,
      html,
      smtp,
    });
  }

  // Fallback to Resend API
  const apiKey = process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
  const resend = new Resend(apiKey);

  const fromEmail = process.env.SMTP_FROM || "onboarding@resend.dev";
  const fromName = "Meka PoS";
  let resendFrom = `${fromName} <${fromEmail}>`;

  if (
    /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail) ||
    fromEmail.includes("example.com")
  ) {
    resendFrom = `${fromName} <onboarding@resend.dev>`;
  }

  const { data, error } = await resend.emails.send({
    from: resendFrom,
    to: [to],
    subject,
    html,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nBody: ${html}`);
      return { id: "mock-success", mock: true };
    }
    throw new Error(`Resend delivery failed: ${error.message}`);
  }
  return data;
}

export async function sendTenantEmail(input: SendTenantEmailInput) {
  const tenant = await Tenant.findById(input.tenantId).lean();
  if (!tenant) {
    throw new Error("Tenant not found for email delivery");
  }

  const settings = input.settings || tenant.settings || {};
  const provider = (settings.emailProvider || "resend") as MailProvider;

  const fromName = settings.emailFromName || tenant.name || "MEKA POS";
  const fromEmail =
    settings.emailFromAddress ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "onboarding@resend.dev";
  const replyTo = settings.emailReplyToAddress || undefined;

  const smtp = resolveSmtpConfig({
    host: settings.emailSmtpHost,
    port: settings.emailSmtpPort,
    user: settings.emailSmtpUser,
    pass: settings.emailSmtpPassword,
    fromEmail,
    fromName,
  });

  // Prefer SMTP when configured in env/settings so delivery works without a verified Resend domain.
  if (smtp.isConfigured) {
    return sendViaSmtp({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo,
      smtp,
    });
  }

  if (provider === "resend") {
    const apiKey =
      settings.emailApiKey || process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
    if (!apiKey) {
      throw new Error("Resend API key is not configured");
    }

    let resendFrom = `${fromName} <${fromEmail}>`;

    // Resend requires a verified domain. If using a public provider like gmail/yahoo/etc,
    // it will fail unless we use onboarding@resend.dev (for testing/unverified accounts).
    const isPublicDomain =
      /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
    if (isPublicDomain || fromEmail.includes("example.com")) {
      console.log(
        `Overriding unverified Resend from address: ${fromEmail} -> onboarding@resend.dev`,
      );
      resendFrom = `${fromName} <onboarding@resend.dev>`;
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text || "",
      replyTo,
    });

    if (error) {
      if (
        process.env.NODE_ENV === "development" &&
        (error.message.includes("testing emails to your own email address") ||
          error.message.includes("restricted"))
      ) {
        console.warn("\n" + "=".repeat(60));
        console.warn("⚠️  RESEND TESTING RESTRICTION TRIGGERED");
        console.warn(`To: ${input.to}`);
        console.warn(`Subject: ${input.subject}`);
        console.warn(
          "Emails can't be delivered to non-authorized accounts in Resend trial.",
        );
        console.warn(
          "Check the console below for the email content (e.g. verification links).",
        );
        console.warn("=".repeat(60) + "\n");
        console.log(input.html);
        console.log("\n" + "=".repeat(60) + "\n");
        return { id: "mock-success-for-testing", mock: true };
      }

      console.error("Resend delivery failed:", error);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
    return data;
  }

  // Fallback to SMTP for other providers or if SMTP is selected
  const host = settings.emailSmtpHost || process.env.SMTP_HOST;
  const port = parsePort(settings.emailSmtpPort || process.env.SMTP_PORT, 587);
  const user = settings.emailSmtpUser || process.env.SMTP_USER;
  const pass = settings.emailSmtpPassword || process.env.SMTP_PASS;

  if (!fromEmail) {
    throw new Error("From email address is not configured");
  }

  if (!host || !user || !pass) {
    // If SMTP is explicitly selected but is missing configuration,
    // and we have a Resend key, fallback to Resend as a "safe default"
    // to prevent delivery failure, unless provider was explicitly "smtp"
    // and we want strict errors. But for POS users, success is better.
    console.warn(
      `SMTP misconfigured, attempting Resend fallback for provider: ${provider}`,
    );
    const resendApiKey =
      settings.emailApiKey || process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
    if (resendApiKey) {
      let resendFromFallback = `${fromName} <${fromEmail}>`;
      const isPublicDomain =
        /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
      if (isPublicDomain || fromEmail.includes("example.com")) {
        resendFromFallback = `${fromName} <onboarding@resend.dev>`;
      }

      const resendFallback = new Resend(resendApiKey);
      const { data, error } = await resendFallback.emails.send({
        from: resendFromFallback,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text || "",
        replyTo,
      });
      if (error) {
        throw new Error(
          `SMTP misconfigured and Resend fallback failed: ${error.message}`,
        );
      }
      return data;
    }

    throw new Error(
      `Email delivery is not fully configured for ${provider}. Set SMTP host, user, and password.`,
    );
  }

  await sendViaSmtp({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo,
    smtp: {
      host,
      port,
      user,
      pass,
      fromEmail,
      fromName,
      isConfigured: Boolean(host && user && pass),
    },
  });
}
