import nodemailer from "nodemailer";
import { Resend } from "resend";
import Tenant from "@/models/Tenant";

export type MailProvider =
  | "sendgrid"
  | "mailgun"
  | "smtp"
  | "postmark"
  | "resend";

export interface MailerSettings {
  emailProvider?: MailProvider;
  emailApiKey?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  emailReplyToAddress?: string;
  emailSmtpHost?: string;
  emailSmtpPort?: string | number;
  emailSmtpUser?: string;
  emailSmtpPassword?: string;
  [key: string]: unknown;
}

type SendTenantEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  settings?: MailerSettings;
};

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

  const isConfigured = Boolean(host && user && pass);

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    if (!isConfigured) {
      console.debug("[SMTP Config] Not fully configured:", {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass,
        host: host || "MISSING",
        user: user || "MISSING",
        pass: pass ? "SET" : "MISSING",
      });
    }
  }

  return {
    host,
    user,
    pass,
    port,
    fromEmail,
    fromName,
    isConfigured,
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

  console.log("[Email] Sending via SMTP:", {
    host: smtp.host,
    port: smtp.port,
    user: smtp.user ? smtp.user.substring(0, 3) + "***" : "MISSING",
    to,
    subject,
  });

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
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

async function sendViaResend({
  to,
  subject,
  html,
  text,
  replyTo,
  fromName,
  fromEmail,
  apiKey,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName: string;
  fromEmail: string;
  apiKey: string;
}) {
  let resendFrom = `${fromName} <${fromEmail}>`;
  const isPublicDomain =
    /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
  // If no fromEmail is configured, it's a public domain, or example.com, use safe onboarding address
  if (!fromEmail || isPublicDomain || fromEmail.includes("example.com")) {
    resendFrom = `${fromName} <onboarding@resend.dev>`;
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: resendFrom,
    to: [to],
    subject,
    html,
    text: text || "",
    replyTo,
  });

  if (error) {
    const errorMsg = error.message || String(error);
    throw new Error(`Resend delivery failed: ${errorMsg}`);
  }

  return data;
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
    try {
      return await sendViaSmtp({
        to,
        subject,
        html,
        smtp,
      });
    } catch (smtpError) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw smtpError;
      }

      console.warn(
        "SMTP delivery failed for system email, falling back to Resend:",
        smtpError,
      );
      return sendViaResend({
        to,
        subject,
        html,
        fromName: smtp.fromName,
        fromEmail:
          smtp.fromEmail ||
          process.env.SMTP_FROM ||
          process.env.SMTP_USER ||
          "",
        apiKey,
      });
    }
  }

  // If provider is explicitly resend but SMTP is available, still use SMTP to avoid
  // Resend domain verification restrictions when no domain is configured.
  if (smtp.isConfigured && provider === "resend") {
    try {
      return await sendViaSmtp({
        to,
        subject,
        html,
        smtp,
      });
    } catch (smtpError) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw smtpError;
      }

      console.warn(
        "SMTP delivery failed for system email, falling back to Resend:",
        smtpError,
      );
      return sendViaResend({
        to,
        subject,
        html,
        fromName: smtp.fromName,
        fromEmail:
          smtp.fromEmail ||
          process.env.SMTP_FROM ||
          process.env.SMTP_USER ||
          "",
        apiKey,
      });
    }
  }

  // Fallback to Resend API
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Resend API key is not configured");
  }
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  try {
    return await sendViaResend({
      to,
      subject,
      html,
      fromName: "Meka PoS",
      fromEmail,
      apiKey,
    });
  } catch (error) {
    const errorMsg = (error as Error).message || String(error);
    if (
      (process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV !== "production") &&
      (errorMsg.includes("testing emails to your own email address") ||
        errorMsg.includes("restricted") ||
        errorMsg.includes("Resend only allowed to send to") ||
        errorMsg.includes("not verified"))
    ) {
      console.warn("\n" + "=".repeat(60));
      console.warn("⚠️  RESEND TRIAL RESTRICTION - MOCKING EMAIL");
      console.warn(`To: ${to}`);
      console.warn(`Subject: ${subject}`);
      console.warn(
        "In development, email content is logged below for verification.",
      );
      console.warn("=".repeat(60) + "\n");
      console.log("EMAIL PREVIEW:");
      console.log(`From: Meka PoS <onboarding@resend.dev>`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("---");
      console.log(html);
      console.log("\n" + "=".repeat(60) + "\n");
      return { id: "mock-success-for-testing", mock: true };
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nBody: ${html}`);
      return { id: "mock-success", mock: true };
    }
    throw error;
  }
}

export async function sendTenantEmail(input: SendTenantEmailInput) {
  const tenant = await Tenant.findById(input.tenantId).lean();
  if (!tenant) {
    throw new Error("Tenant not found for email delivery");
  }

  const settings = (input.settings || tenant.settings || {}) as MailerSettings;
  const provider = (settings.emailProvider || "resend") as MailProvider;

  const fromName = settings.emailFromName || tenant.name || "MEKA POS";
  const fromEmail =
    settings.emailFromAddress ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "";
  const replyTo = settings.emailReplyToAddress || undefined;

  const smtp = resolveSmtpConfig({
    host: settings.emailSmtpHost,
    port: settings.emailSmtpPort,
    user: settings.emailSmtpUser,
    pass: settings.emailSmtpPassword,
    fromEmail,
    fromName,
  });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[Email] Provider preference check:", {
      configuredProvider: provider,
      smtpConfigured: smtp.isConfigured,
      fromEmail: fromEmail || "NOT SET",
      willUseSMTP: smtp.isConfigured,
    });
  }

  // Prefer SMTP when configured in env/settings so delivery works without a verified Resend domain.
  if (smtp.isConfigured) {
    console.log("[Email] Using SMTP (configured)");
    try {
      return await sendViaSmtp({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo,
        smtp,
      });
    } catch (smtpError) {
      const apiKey = settings.emailApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw smtpError;
      }

      console.warn(
        `SMTP delivery failed for tenant email, falling back to Resend:`,
        smtpError,
      );
      return sendViaResend({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo,
        fromName,
        fromEmail,
        apiKey,
      });
    }
  }

  if (provider === "resend") {
    console.log(
      "[Email] Using Resend (provider set to resend, no SMTP configured)",
    );
    const apiKey = settings.emailApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Resend API key is not configured");
    }

    let resendFrom = `${fromName} <${fromEmail}>`;

    // Resend requires a verified domain. If using a public provider like gmail/yahoo/etc,
    // it will fail unless we use onboarding@resend.dev (for testing/unverified accounts).
    const isPublicDomain =
      /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
    // If no fromEmail is configured or it's a public domain, use the safe onboarding address
    if (!fromEmail || isPublicDomain || fromEmail.includes("example.com")) {
      console.log(
        `Using safe Resend sender for unverified domain: ${fromEmail || "not configured"} -> onboarding@resend.dev`,
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
      const errorMsg = error.message || String(error);
      if (
        (process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV !== "production") &&
        (errorMsg.includes("testing emails to your own email address") ||
          errorMsg.includes("restricted") ||
          errorMsg.includes("Resend only allowed to send to") ||
          errorMsg.includes("not verified"))
      ) {
        console.warn("\n" + "=".repeat(60));
        console.warn("⚠️  RESEND TESTING RESTRICTION TRIGGERED");
        console.warn(`To: ${input.to}`);
        console.warn(`Subject: ${input.subject}`);
        console.warn(
          "Emails can't be delivered to non-authorized accounts in Resend trial.",
        );
        console.warn(
          "In development, email content is logged below for verification.",
        );
        console.warn("=".repeat(60) + "\n");
        console.log("EMAIL PREVIEW:");
        console.log(`From: ${resendFrom}`);
        console.log(`To: ${input.to}`);
        console.log(`Subject: ${input.subject}`);
        console.log("---");
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
      `[Email] SMTP fallback: Not fully configured for provider "${provider}". Missing:`,
      {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass,
      },
    );
    const resendApiKey = settings.emailApiKey || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      console.log("[Email] Falling back to Resend (SMTP incomplete)");
      return sendViaResend({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo,
        fromName,
        fromEmail,
        apiKey: resendApiKey,
      });
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
